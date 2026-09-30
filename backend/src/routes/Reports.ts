import { Router } from "express";
import { prisma } from "../../prisma";
import { requireAuth, requireRoles } from "../middleware/auth";
import { UserRole } from "../generated/prisma/enums";

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
  requireRoles(UserRole.OWNER, UserRole.MANAGER, UserRole.RECEPTIONIST, UserRole.ACCOUNTANT),
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

export default router;