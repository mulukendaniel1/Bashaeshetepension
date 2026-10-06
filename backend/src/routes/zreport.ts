import { Router } from "express";
import { prisma } from "../../prisma";
import { requireAuth, requireRoles, AuthRequest } from "../middleware/auth";
import { UserRole } from "../generated/prisma/enums";
import { serializeDecimals } from "../utils/decimal";

const router = Router();
router.use(requireAuth);

function paramId(req: { params: Record<string, string | string[] | undefined> }): string {
  const value = req.params.id;
  return Array.isArray(value) ? value[0] : (value as string);
}

const canViewAnyShift = requireRoles(UserRole.OWNER, UserRole.MANAGER, UserRole.ACCOUNTANT);

// Build the full Z Report payload for one shift: payments grouped by
// method, bank transfers grouped by account (once bank accounts exist,
// this naturally picks them up since it groups by whatever bankAccount is
// set on each payment), expenses recorded during the shift window, and
// the cash reconciliation (opening vs counted closing vs expected).
async function buildShiftReport(shiftId: string) {
  const shift = await prisma.shift.findUniqueOrThrow({
    where: { id: shiftId },
    include: { user: { select: { id: true, fullName: true, role: true } } },
  });

  const payments = await prisma.payment.findMany({
    where: { shiftId },
    include: {
      bankAccount: { select: { id: true, name: true, accountType: true } },
      booking: { include: { guest: { select: { fullName: true } }, room: { select: { roomNumber: true } } } },
    },
    orderBy: { createdAt: "asc" },
  });

  const totalsByMethod: Record<string, number> = {};
  let totalCollected = 0;

  for (const payment of payments) {
    const amount = Number(payment.amount);
    totalsByMethod[payment.method] = (totalsByMethod[payment.method] || 0) + amount;
    totalCollected += amount;
  }

  const bankTransferPayments = payments.filter((p: (typeof payments)[number]) => p.method === "BANK_TRANSFER");
  const totalsByBankAccount: Record<string, number> = {};

  for (const payment of bankTransferPayments) {
    const key = payment.bankAccount?.name || "Unassigned";
    totalsByBankAccount[key] = (totalsByBankAccount[key] || 0) + Number(payment.amount);
  }

  const cashCollected = totalsByMethod["CASH"] || 0;
  const expectedClosingCash = Number(shift.openingCash) + cashCollected;
  const actualClosingCash = shift.closingCash !== null ? Number(shift.closingCash) : null;
  const cashVariance = actualClosingCash !== null ? actualClosingCash - expectedClosingCash : null;

  return {
    shift: serializeDecimals(shift),
    payments: serializeDecimals(payments),
    totalsByMethod,
    totalsByBankAccount,
    totalCollected,
    totalPaymentCount: payments.length,
    cashReconciliation: {
      openingCash: Number(shift.openingCash),
      cashCollected,
      expectedClosingCash,
      actualClosingCash,
      variance: cashVariance,
    },
  };
}

// A receptionist can pull her own shift's report at any time, even
// mid-shift, to see where things stand before closing out.
router.get("/shift/:id", async (req: AuthRequest, res, next) => {
  try {
    const id = paramId(req);

    const shift = await prisma.shift.findUniqueOrThrow({ where: { id } });
    const isPrivileged = req.user?.role === UserRole.OWNER || req.user?.role === UserRole.MANAGER || req.user?.role === UserRole.ACCOUNTANT;

    if (!isPrivileged && shift.userId !== req.user?.id) {
      return res.status(403).json({ success: false, message: "You can only view your own shift reports." });
    }

    const report = await buildShiftReport(id);
    res.json({ success: true, report });
  } catch (e) {
    next(e);
  }
});

// Owner/Manager/Accountant: every shift within a date range, each with its
// own totals, for a daily or weekly rollup view.
router.get("/range", canViewAnyShift, async (req, res, next) => {
  try {
    const from = req.query.from ? new Date(String(req.query.from)) : new Date(new Date().setHours(0, 0, 0, 0));
    const to = req.query.to ? new Date(String(req.query.to)) : new Date();

    const shifts = await prisma.shift.findMany({
      where: { openedAt: { gte: from, lte: to } },
      include: { user: { select: { id: true, fullName: true } } },
      orderBy: { openedAt: "desc" },
    });

    const reports = await Promise.all(shifts.map((s: (typeof shifts)[number]) => buildShiftReport(s.id)));

    const grandTotalsByMethod: Record<string, number> = {};
    const grandTotalsByBankAccount: Record<string, number> = {};
    let grandTotal = 0;

    for (const report of reports) {
      for (const [method, amount] of Object.entries(report.totalsByMethod) as [string, number][]) {
        grandTotalsByMethod[method] = (grandTotalsByMethod[method] || 0) + amount;
      }
      for (const [account, amount] of Object.entries(report.totalsByBankAccount) as [string, number][]) {
        grandTotalsByBankAccount[account] = (grandTotalsByBankAccount[account] || 0) + amount;
      }
      grandTotal += report.totalCollected;
    }

    res.json({
      success: true,
      from,
      to,
      shiftCount: shifts.length,
      grandTotalsByMethod,
      grandTotalsByBankAccount,
      grandTotal,
      reports,
    });
  } catch (e) {
    next(e);
  }
});

export default router;