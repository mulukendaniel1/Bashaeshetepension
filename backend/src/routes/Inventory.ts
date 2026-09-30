import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../prisma";
import { requireAuth, requireRoles } from "../middleware/auth";
import { UserRole } from "../generated/prisma/enums";

const router = Router();
router.use(requireAuth);

const canManageInventory = requireRoles(
  UserRole.OWNER,
  UserRole.MANAGER,
  UserRole.RECEPTIONIST,
  UserRole.ACCOUNTANT
);

function paramId(req: { params: Record<string, string | string[] | undefined> }): string {
  const value = req.params.id;
  return Array.isArray(value) ? value[0] : (value as string);
}

const itemSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  sku: z.string().optional(),
  quantity: z.coerce.number().nonnegative().default(0),
  minimumStock: z.coerce.number().nonnegative().default(0),
  unit: z.string().min(1),
  purchasePrice: z.coerce.number().nonnegative().default(0),
  supplier: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
});

const adjustSchema = z.object({
  delta: z.coerce.number().int(),
  reason: z.string().optional(),
});

router.get("/", async (req, res, next) => {
  try {
    const category = req.query.category ? String(req.query.category) : undefined;

    const items = await prisma.inventoryItem.findMany({
      where: category ? { category } : undefined,
      orderBy: { name: "asc" },
    });

    res.json({ success: true, items });
  } catch (e) {
    next(e);
  }
});

router.post("/", canManageInventory, async (req, res, next) => {
  try {
    const input = itemSchema.parse(req.body);
    const item = await prisma.inventoryItem.create({ data: input });
    res.status(201).json({ success: true, item });
  } catch (e) {
    next(e);
  }
});

router.patch("/:id", canManageInventory, async (req, res, next) => {
  try {
    const item = await prisma.inventoryItem.update({
      where: { id: paramId(req) },
      data: itemSchema.partial().parse(req.body),
    });

    res.json({ success: true, item });
  } catch (e) {
    next(e);
  }
});

router.post("/:id/adjust", canManageInventory, async (req, res, next) => {
  try {
    const { delta, reason } = adjustSchema.parse(req.body);
    const id = paramId(req);

    const item = await prisma.inventoryItem.findUniqueOrThrow({ where: { id } });
    const newQuantity = Math.max(Number(item.quantity) + delta, 0);

    const [, updated] = await prisma.$transaction([
      prisma.inventoryTransaction.create({
        data: {
          itemId: id,
          type: delta >= 0 ? "IN" : "OUT",
          quantity: Math.abs(delta),
          reason,
        },
      }),
      prisma.inventoryItem.update({
        where: { id },
        data: { quantity: newQuantity },
      }),
    ]);

    res.json({ success: true, item: updated });
  } catch (e) {
    next(e);
  }
});

router.delete("/:id", canManageInventory, async (req, res, next) => {
  try {
    await prisma.inventoryItem.delete({ where: { id: paramId(req) } });
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

export default router;