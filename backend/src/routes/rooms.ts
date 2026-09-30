import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../prisma";
import { requireAuth, requireRoles } from "../middleware/auth";
import { UserRole } from "../generated/prisma/enums";

const router = Router();
router.use(requireAuth);

function paramId(req: { params: Record<string, string | string[] | undefined> }): string {
  const value = req.params.id;
  return Array.isArray(value) ? value[0] : (value as string);
}

const canManageRooms = requireRoles(
  UserRole.OWNER,
  UserRole.MANAGER,
  UserRole.RECEPTIONIST,
  UserRole.ACCOUNTANT
);

router.get("/", async (_req, res, next) => {
  try {
    const rooms = await prisma.room.findMany({ include: { roomType: true }, orderBy: { roomNumber: "asc" } });
    res.json({ success: true, rooms });
  } catch (e) { next(e); }
});

router.get("/types", async (_req, res, next) => {
  try { res.json({ success: true, roomTypes: await prisma.roomType.findMany({ orderBy: { name: "asc" } }) }); } catch (e) { next(e); }
});

const roomSchema = z.object({ roomNumber: z.string().min(1), floor: z.string().optional(), status: z.enum(["AVAILABLE", "OCCUPIED", "RESERVED", "CLEANING", "MAINTENANCE"]).optional(), price: z.coerce.number().nonnegative().optional(), description: z.string().optional(), imageUrl: z.string().url().optional(), roomTypeId: z.string().min(1) });

router.post("/", canManageRooms, async (req, res, next) => {
  try { const data = roomSchema.parse(req.body); const room = await prisma.room.create({ data: { ...data, price: data.price } }); res.status(201).json({ success: true, room }); } catch (e) { next(e); }
});

router.patch("/:id", canManageRooms, async (req, res, next) => {
  try { const data = roomSchema.partial().parse(req.body); const room = await prisma.room.update({ where: { id: paramId(req) }, data }); res.json({ success: true, room }); } catch (e) { next(e); }
});

router.delete("/:id", canManageRooms, async (req, res, next) => {
  try { await prisma.room.delete({ where: { id: paramId(req) } }); res.json({ success: true }); } catch (e) { next(e); }
});

export default router;