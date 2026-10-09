import { Router } from "express";
import { prisma } from "../../prisma";
import { requireAuth } from "../middleware/auth";

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

export default router;