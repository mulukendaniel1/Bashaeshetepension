import { Router } from "express";
import { prisma } from "../../prisma";
import { z } from "zod";
import { requireAuth, requireRoles, AuthRequest } from "../middleware/auth";
import { UserRole } from "../generated/prisma/enums";
import { adjustPaymentAmount, cancelPayment, deleteMaintenanceRequest, SafeError } from "../utils/Recordactions";

const router = Router();
router.use(requireAuth);

function toISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

router.get(
  "/ledger",
  requireRoles(
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.RECEPTIONIST,
    UserRole.ACCOUNTANT,
    UserRole.STAFF
  ),
  async (req, res, next) => {
    try {
      const [payments, expenses, repairs] = await Promise.all([
        prisma.payment.findMany({ orderBy: { createdAt: "desc" } }),
        prisma.expense.findMany({ orderBy: { createdAt: "desc" } }),
        prisma.maintenanceRequest.findMany({
          where: { status: "COMPLETED", cost: { gt: 0 } },
          orderBy: { completedAt: "desc" },
        }),
      ]);

      const rows = [
        ...payments.map((payment) => ({
          id: `payment-${payment.id}`,
          category: "Room Bookings",
          type: "Revenue" as const,
          amount: Number(payment.amount),
          date: toISODate(payment.createdAt),
        })),
        ...expenses.map((expense) => ({
          id: `expense-${expense.id}`,
          category: expense.category,
          type: "Expense" as const,
          amount: Number(expense.amount),
          date: toISODate(expense.createdAt),
        })),
        ...repairs.map((repair) => ({
          id: `repair-${repair.id}`,
          category: "Maintenance",
          type: "Expense" as const,
          amount: Number(repair.cost),
          date: toISODate(repair.completedAt ?? repair.updatedAt),
        })),
      ].sort((a, b) => (a.date < b.date ? 1 : -1));

      res.json({ success: true, rows });
    } catch (e) {
      next(e);
    }
  }
);

// Only the owner and the manager change or delete report entries.
// Other roles read the reports and nothing more.
const canEditReport = requireRoles(UserRole.OWNER, UserRole.MANAGER);

// A ledger row id looks like payment-<id>, expense-<id> or repair-<id>.
function parseEntry(raw: string | string[] | undefined) {
  const value = Array.isArray(raw) ? raw[0] : raw || "";
  const match = value.match(/^(payment|expense|repair)-(.+)$/);

  if (!match) throw new SafeError("Unknown report entry.", 400);

  return { kind: match[1] as "payment" | "expense" | "repair", refId: match[2] };
}

const amountSchema = z.object({ amount: z.coerce.number().positive() });

router.patch("/entry/:id", canEditReport, async (req: AuthRequest, res, next) => {
  try {
    const { amount } = amountSchema.parse(req.body);
    const { kind, refId } = parseEntry(req.params.id);

    if (kind === "payment") {
      await adjustPaymentAmount(refId, req.user!.id, amount);
    } else if (kind === "expense") {
      await prisma.expense.update({ where: { id: refId }, data: { amount } });
    } else {
      await prisma.maintenanceRequest.update({ where: { id: refId }, data: { cost: amount } });
    }

    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

router.delete("/entry/:id", canEditReport, async (req: AuthRequest, res, next) => {
  try {
    const { kind, refId } = parseEntry(req.params.id);

    if (kind === "payment") {
      const reason = String(req.query.reason || "").trim();

      if (reason.length < 3) {
        throw new SafeError("Write a short reason for removing this payment.", 400);
      }

      await cancelPayment(refId, req.user!.id, reason.slice(0, 200));
    } else if (kind === "expense") {
      await prisma.expense.delete({ where: { id: refId } });
    } else {
      await deleteMaintenanceRequest(refId, req.user!.id);
    }

    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

export default router;