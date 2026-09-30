import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../prisma";
import { requireAuth, requireRoles } from "../middleware/auth";
import { UserRole } from "../generated/prisma/enums";

const router = Router();
router.use(requireAuth);

const canManageGuests = requireRoles(UserRole.OWNER, UserRole.MANAGER, UserRole.RECEPTIONIST);

function paramId(req: { params: Record<string, string | string[] | undefined> }): string {
  const value = req.params.id;
  return Array.isArray(value) ? value[0] : (value as string);
}

const guestSchema = z.object({
  fullName: z.string().min(2),
  phone: z.string().min(3),
  email: z.string().email().optional(),
  gender: z.string().optional(),
  nationality: z.string().optional(),
  idType: z.string().optional(),
  idNumber: z.string().optional(),
  address: z.string().optional(),
  emergencyName: z.string().optional(),
  emergencyPhone: z.string().optional(),
  notes: z.string().optional(),
});

function withStats(
  guest: Awaited<ReturnType<typeof findGuestWithBookings>>
) {
  const nonCancelled = guest.bookings.filter(
    (booking) => booking.status !== "CANCELLED"
  );

  const totalVisits = nonCancelled.length;

  const totalSpending = nonCancelled.reduce(
    (sum, booking) => sum + Number(booking.totalAmount),
    0
  );

  const active = guest.bookings.find(
    (booking) => booking.status === "CHECKED_IN"
  );

  const currentBooking = active
    ? `${active.bookingNumber} · Room ${active.room.roomNumber}`
    : null;

  const history = guest.bookings.map((booking) => ({
    reference: booking.bookingNumber,
    room: booking.room.roomNumber,
    roomType: booking.room.roomType.name,
    checkIn: booking.checkInDate,
    checkOut: booking.checkOutDate,
    amount: Number(booking.totalAmount),
    status: booking.status,
  }));

  const { bookings, ...rest } = guest;

  return { ...rest, totalVisits, totalSpending, currentBooking, history };
}

function findGuestWithBookings(id: string) {
  return prisma.guest.findUniqueOrThrow({
    where: { id },
    include: {
      bookings: {
        include: { room: { include: { roomType: true } } },
        orderBy: { checkInDate: "desc" },
      },
    },
  });
}

router.get("/", async (req, res, next) => {
  try {
    const q = String(req.query.q || "").trim();

    const guests = await prisma.guest.findMany({
      where: q
        ? {
            OR: [
              { fullName: { contains: q, mode: "insensitive" } },
              { phone: { contains: q, mode: "insensitive" } },
              { idNumber: { contains: q, mode: "insensitive" } },
            ],
          }
        : undefined,
      include: {
        bookings: {
          include: { room: { include: { roomType: true } } },
          orderBy: { checkInDate: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, guests: guests.map(withStats) });
  } catch (e) {
    next(e);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const guest = await findGuestWithBookings(paramId(req));
    res.json({ success: true, guest: withStats(guest) });
  } catch (e) {
    next(e);
  }
});

router.post("/", canManageGuests, async (req, res, next) => {
  try {
    const guest = await prisma.guest.create({ data: guestSchema.parse(req.body) });
    res.status(201).json({
      success: true,
      guest: withStats({ ...guest, bookings: [] }),
    });
  } catch (e) {
    next(e);
  }
});

router.patch("/:id", canManageGuests, async (req, res, next) => {
  try {
    await prisma.guest.update({
      where: { id: paramId(req) },
      data: guestSchema.partial().parse(req.body),
    });

    const guest = await findGuestWithBookings(paramId(req));
    res.json({ success: true, guest: withStats(guest) });
  } catch (e) {
    next(e);
  }
});

export default router;