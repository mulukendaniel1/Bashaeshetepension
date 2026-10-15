import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../prisma";
import { requireAuth, requireRoles, AuthRequest } from "../middleware/auth";
import { UserRole } from "../generated/prisma/enums";
import { cancelPayment } from "../utils/Recordactions";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const method = req.query.method ? String(req.query.method) : undefined;

    const payments = await prisma.payment.findMany({
      where: method ? { method: method as any } : undefined,
      include: {
        booking: {
          include: {
            guest: true,
            room: true,
          },
        },
        receivedBy: {
          select: { id: true, fullName: true },
        },
        bankTransactionMatch: { select: { id: true, matchedAt: true } },
        bankAccount: { select: { id: true, name: true, accountType: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, payments });
  } catch (e) {
    next(e);
  }
});

router.get("/summary", async (req, res, next) => {
  try {
    const payments = await prisma.payment.findMany();

    const totalCollected = payments.reduce(
      (sum, payment) => sum + Number(payment.amount),
      0
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todaysPayments = payments.filter(
      (payment) => new Date(payment.createdAt) >= today
    ).length;

    res.json({
      success: true,
      summary: {
        totalCollected,
        totalPayments: payments.length,
        todaysPayments,
      },
    });
  } catch (e) {
    next(e);
  }
});

const cancelSchema = z.object({ reason: z.string().trim().min(3, "Write a short reason.").max(200) });

// Cancel a payment recorded by mistake. Owner and manager only.
router.post(
  "/:id/cancel",
  requireRoles(UserRole.OWNER, UserRole.MANAGER),
  async (req: AuthRequest, res, next) => {
    try {
      const { reason } = cancelSchema.parse(req.body);
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      await cancelPayment(id, req.user!.id, reason);

      res.json({ success: true });
    } catch (e) {
      next(e);
    }
  }
);

export default router;