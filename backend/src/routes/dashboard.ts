import { Router } from "express";
import { prisma } from "../../prisma";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);
router.get("/summary", async (_req, res, next) => {
  try {
    const [rooms, guests, bookings, revenue] = await Promise.all([
      prisma.room.count(),
      prisma.guest.count(),
      prisma.booking.count({ where: { status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN"] } } }),
      prisma.payment.aggregate({ _sum: { amount: true } }),
    ]);
    const occupiedRooms = await prisma.room.count({ where: { status: "OCCUPIED" } });
    res.json({ success: true, summary: { rooms, occupiedRooms, guests, activeBookings: bookings, totalRevenue: revenue._sum.amount || 0 } });
  } catch (e) { next(e); }
});
export default router;
