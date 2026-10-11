import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../prisma";
import { requireAuth, requireRoles, AuthRequest } from "../middleware/auth";
import { UserRole } from "../generated/prisma/enums";
import { serializeDecimals } from "../utils/decimal";

// Requests that visitors send from the public website.
// Staff confirm a request by picking a room. That creates the booking.
const router = Router();
router.use(requireAuth);

const canManage = requireRoles(UserRole.OWNER, UserRole.MANAGER, UserRole.RECEPTIONIST);

const BLOCKING = ["PENDING", "CONFIRMED", "CHECKED_IN"] as const;
const DAY_MS = 24 * 60 * 60 * 1000;

function paramId(req: { params: Record<string, string | string[] | undefined> }): string {
  const value = req.params.id;
  return Array.isArray(value) ? value[0] : (value as string);
}

async function nextBookingNumber() {
  const last = await prisma.booking.findFirst({
    orderBy: { createdAt: "desc" },
    select: { bookingNumber: true },
  });

  const lastNumber = last ? parseInt(last.bookingNumber.replace(/\D/g, ""), 10) : 1000;
  const next = Number.isFinite(lastNumber) ? lastNumber + 1 : 1001;

  return `BE-${next}`;
}

function overlapWhere(checkIn: Date, checkOut: Date) {
  return {
    status: { in: [...BLOCKING] },
    checkInDate: { lt: checkOut },
    checkOutDate: { gt: checkIn },
  };
}

router.get("/", canManage, async (req, res, next) => {
  try {
    const status = req.query.status ? String(req.query.status) : undefined;

    const requests = await prisma.bookingRequest.findMany({
      where: status ? { status: status as any } : undefined,
      include: { roomType: { select: { id: true, name: true, basePrice: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    res.json({ success: true, requests: serializeDecimals(requests) });
  } catch (e) {
    next(e);
  }
});

// Rooms that are free for this request's dates.
router.get("/:id/rooms", canManage, async (req, res, next) => {
  try {
    const request = await prisma.bookingRequest.findUniqueOrThrow({
      where: { id: paramId(req) },
    });

    const rooms = await prisma.room.findMany({
      where: {
        roomTypeId: request.roomTypeId,
        status: { not: "MAINTENANCE" },
        bookings: { none: overlapWhere(request.checkInDate, request.checkOutDate) },
      },
      select: { id: true, roomNumber: true, floor: true, status: true, price: true },
      orderBy: { roomNumber: "asc" },
    });

    res.json({ success: true, rooms: serializeDecimals(rooms) });
  } catch (e) {
    next(e);
  }
});

const confirmSchema = z.object({ roomId: z.string().min(1) });

router.post("/:id/confirm", canManage, async (req: AuthRequest, res, next) => {
  try {
    const { roomId } = confirmSchema.parse(req.body);
    const id = paramId(req);

    const request = await prisma.bookingRequest.findUniqueOrThrow({ where: { id } });

    if (request.status !== "NEW") {
      return res.status(409).json({
        success: false,
        message: "This request was already handled.",
      });
    }

    const room = await prisma.room.findUniqueOrThrow({
      where: { id: roomId },
      include: { roomType: true },
    });

    if (room.status === "MAINTENANCE") {
      return res.status(409).json({ success: false, message: "This room is under maintenance." });
    }

    const clash = await prisma.booking.count({
      where: {
        roomId: room.id,
        ...overlapWhere(request.checkInDate, request.checkOutDate),
      },
    });

    if (clash > 0) {
      return res.status(409).json({
        success: false,
        message: "This room is already booked for those dates. Pick another room.",
      });
    }

    const nights = Math.max(
      Math.ceil((request.checkOutDate.getTime() - request.checkInDate.getTime()) / DAY_MS),
      1
    );
    const pricePerNight = Number(room.price ?? room.roomType.basePrice);
    const total = pricePerNight * nights;
    const bookingNumber = await nextBookingNumber();

    const booking = await prisma.$transaction(async (tx) => {
      // Reuse the guest when the phone number is known.
      const existing = await tx.guest.findFirst({ where: { phone: request.phone } });

      const guest =
        existing ||
        (await tx.guest.create({
          data: {
            fullName: request.fullName,
            phone: request.phone,
            email: request.email || undefined,
          },
        }));

      const created = await tx.booking.create({
        data: {
          bookingNumber,
          guestId: guest.id,
          roomId: room.id,
          checkInDate: request.checkInDate,
          checkOutDate: request.checkOutDate,
          numberOfGuests: request.numberOfGuests,
          pricePerNight,
          nights,
          subtotal: total,
          discount: 0,
          tax: 0,
          additionalFees: 0,
          totalAmount: total,
          amountPaid: 0,
          balance: total,
          status: "PENDING",
          paymentStatus: "PENDING",
          notes: `Website request WR-${request.id.slice(-6).toUpperCase()}${
            request.message ? `. Guest note: ${request.message}` : ""
          }`,
          createdById: req.user?.id,
        },
      });

      // Only an empty room switches to Reserved. A room in use keeps its status.
      if (room.status === "AVAILABLE") {
        await tx.room.update({ where: { id: room.id }, data: { status: "RESERVED" } });
      }

      await tx.bookingRequest.update({
        where: { id },
        data: { status: "CONFIRMED", bookingNumber },
      });

      return created;
    });

    res.json({ success: true, bookingNumber: booking.bookingNumber });
  } catch (e) {
    next(e);
  }
});

router.post("/:id/decline", canManage, async (req, res, next) => {
  try {
    const id = paramId(req);
    const request = await prisma.bookingRequest.findUniqueOrThrow({ where: { id } });

    if (request.status !== "NEW") {
      return res.status(409).json({
        success: false,
        message: "This request was already handled.",
      });
    }

    await prisma.bookingRequest.update({ where: { id }, data: { status: "DECLINED" } });
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

export default router;