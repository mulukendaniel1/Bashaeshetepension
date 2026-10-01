import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../prisma";
import { serializeDecimals } from "../utils/decimal";
import { requireAuth, requireRoles, AuthRequest } from "../middleware/auth";
import { UserRole } from "../generated/prisma/enums";

const router = Router();
router.use(requireAuth);

const canManageExpenses = requireRoles(UserRole.OWNER, UserRole.MANAGER, UserRole.ACCOUNTANT);

function paramId(req: { params: Record<string, string | string[] | undefined> }): string {
  const value = req.params.id;
  return Array.isArray(value) ? value[0] : (value as string);
}

const expenseSchema = z.object({
  amount: z.coerce.number().positive(),
  category: z.string().min(1),
  description: z.string().optional(),
  method: z.enum(["CASH", "TELEBIRR", "CBE_BIRR", "BANK_TRANSFER", "CARD", "OTHER"]),
  notes: z.string().optional(),
});

router.get("/", async (req, res, next) => {
  try {
    const category = req.query.category ? String(req.query.category) : undefined;

    const expenses = await prisma.expense.findMany({
      where: category ? { category } : undefined,
      include: {
        recordedBy: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, expenses: serializeDecimals(expenses) });
  } catch (e) {
    next(e);
  }
});

router.post("/", canManageExpenses, async (req: AuthRequest, res, next) => {
  try {
    const input = expenseSchema.parse(req.body);

    const expense = await prisma.expense.create({
      data: { ...input, recordedById: req.user!.id },
      include: { recordedBy: { select: { id: true, fullName: true } } },
    });

    res.status(201).json({ success: true, expense: serializeDecimals(expense) });
  } catch (e) {
    next(e);
  }
});

router.patch("/:id", canManageExpenses, async (req, res, next) => {
  try {
    const expense = await prisma.expense.update({
      where: { id: paramId(req) },
      data: expenseSchema.partial().parse(req.body),
      include: { recordedBy: { select: { id: true, fullName: true } } },
    });

    res.json({ success: true, expense: serializeDecimals(expense) });
  } catch (e) {
    next(e);
  }
});

router.delete("/:id", canManageExpenses, async (req, res, next) => {
  try {
    await prisma.expense.delete({ where: { id: paramId(req) } });
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

export default router;