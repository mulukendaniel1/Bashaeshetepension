import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../prisma";
import type { Prisma } from "../generated/prisma/client";
import { requireAuth, requireRoles, AuthRequest } from "../middleware/auth";

import { UserRole } from "../generated/prisma/enums";

const router = Router();
router.use(requireAuth);

const canManageBookings = requireRoles(UserRole.OWNER, UserRole.MANAGER, UserRole.RECEPTIONIST);
const canRecordPayments = requireRoles(UserRole.OWNER, UserRole.MANAGER, UserRole.RECEPTIONIST, UserRole.ACCOUNTANT);

/**
 * Notification hook. It logs the event and never throws,
 * so a notification problem cannot break a booking, check-in or check-out.
 * Replace the body later if you add a notifications table, Telegram or SMS.
 */
async function notify(type: string, title: string, message: string): Promise<void> {
  try {
    console.log(`[notify] ${type}: ${title} - ${message}`);
  } catch (err) {
    console.error("Notification failed:", err);
  }
}

function paramId(req: { params: Record<string, string | string[] | undefined> }): string {
  const value = req.params.id;
  return Array.isArray(value) ? value[0] : (value as string);
}

const bookingSchema = z.object({
  guestId: z.string().min(1),
  roomId: z.string().min(1),
  checkInDate: z.coerce.date(),
  checkOutDate: z.coerce.date(),
  numberOfGuests: z.coerce.number().int().positive().default(1),
  discount: z.coerce.number().nonnegative().default(0),
  tax: z.coerce.number().nonnegative().default(0),
  additionalFees: z.coerce.number().nonnegative().default(0),
  notes: z.string().optional(),
});

function nightsBetween(checkIn: Date, checkOut: Date) {
  const ms = checkOut.getTime() - checkIn.getTime();
  return Math.max(Math.ceil(ms / (1000 * 60 * 60 * 24)), 1);
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

function derivePaymentStatus(amountPaid: number, totalAmount: number): "PENDING" | "PARTIAL" | "PAID" {
  if (amountPaid <= 0) return "PENDING";
  if (amountPaid >= totalAmount) return "PAID";
  return "PARTIAL";
}

const includeRelations = {
  guest: true,
  room: { include: { roomType: true } },
  payments: true,
};

router.get("/", async (req, res, next) => {
  try {
    const status = req.query.status ? String(req.query.status) : undefined;

    const bookings = await prisma.booking.findMany({
      where: status ? { status: status as any } : undefined,
      include: includeRelations,
      orderBy: { checkInDate: "desc" },
    });

    res.json({ success: true, bookings });
  } catch (e) {
    next(e);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const booking = await prisma.booking.findUniqueOrThrow({
      where: { id: paramId(req) },
      include: includeRelations,
    });

    res.json({ success: true, booking });
  } catch (e) {
    next(e);
  }
});

router.post("/", canManageBookings, async (req: AuthRequest, res, next) => {
  try {
    const input = bookingSchema.parse(req.body);

    if (input.checkOutDate <= input.checkInDate) {
      return res.status(400).json({
        success: false,
        message: "Check-out date must be after check-in date.",
      });
    }

    const room = await prisma.room.findUniqueOrThrow({
      where: { id: input.roomId },
      include: { roomType: true },
    });

    const nights = nightsBetween(input.checkInDate, input.checkOutDate);
    const pricePerNight = Number(room.price ?? room.roomType.basePrice);
    const subtotal = pricePerNight * nights;
    const totalAmount = subtotal - input.discount + input.tax + input.additionalFees;
    const bookingNumber = await nextBookingNumber();

    const booking = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const created = await tx.booking.create({
        data: {
          bookingNumber,
          guestId: input.guestId,
          roomId: input.roomId,
          checkInDate: input.checkInDate,
          checkOutDate: input.checkOutDate,
          numberOfGuests: input.numberOfGuests,
          pricePerNight,
          nights,
          subtotal,
          discount: input.discount,
          tax: input.tax,
          additionalFees: input.additionalFees,
          totalAmount,
          amountPaid: 0,
          balance: totalAmount,
          status: "PENDING",
          paymentStatus: "PENDING",
          notes: input.notes,
          createdById: req.user?.id,
        },
        include: includeRelations,
      });

      await tx.room.update({
        where: { id: input.roomId },
        data: { status: "RESERVED" },
      });

      return created;
    });

    await notify(
      "BOOKING_CREATED",
      "New booking created",
      `${booking.guest.fullName} booked Room ${booking.room.roomNumber} (${booking.bookingNumber}).`
    );

    res.status(201).json({ success: true, booking });
  } catch (e) {
    next(e);
  }
});

const statusUpdateSchema = z.object({
  status: z.enum([
    "PENDING",
    "CONFIRMED",
    "CHECKED_IN",
    "CHECKED_OUT",
    "CANCELLED",
    "NO_SHOW",
  ]),
});

router.patch("/:id/status", canManageBookings, async (req, res, next) => {
  try {
    const { status } = statusUpdateSchema.parse(req.body);

    const booking = await prisma.booking.findUniqueOrThrow({
      where: { id: paramId(req) },
    });

    // A payment must be on record before the guest checks in.
    if (status === "CHECKED_IN" && Number(booking.amountPaid) <= 0) {
      return res.status(409).json({
        success: false,
        message: "Record a payment before checking in the guest.",
      });
    }

    // The guest cannot leave while a balance remains.
    if (status === "CHECKED_OUT" && Number(booking.balance) > 0) {
      return res.status(409).json({
        success: false,
        message: `The guest still owes ${Number(booking.balance).toLocaleString()} ETB. Record the payment before check-out.`,
      });
    }

    const roomStatusForBookingStatus: Record<string, string | undefined> = {
      CONFIRMED: "RESERVED",
      CHECKED_IN: "OCCUPIED",
      CHECKED_OUT: "CLEANING",
      CANCELLED: "AVAILABLE",
      NO_SHOW: "AVAILABLE",
    };

    const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const result = await tx.booking.update({
        where: { id: paramId(req) },
        data: { status },
        include: includeRelations,
      });

      const newRoomStatus = roomStatusForBookingStatus[status];

      if (newRoomStatus) {
        await tx.room.update({
          where: { id: booking.roomId },
          data: { status: newRoomStatus as any },
        });
      }

      return result;
    });

    if (status === "CHECKED_IN") {
      await notify(
        "GUEST_CHECKED_IN",
        "Guest checked in",
        `${updated.guest.fullName} checked into Room ${updated.room.roomNumber}.`
      );
    }

    if (status === "CHECKED_OUT") {
      await notify(
        "GUEST_CHECKED_OUT",
        "Guest checked out",
        `${updated.guest.fullName} checked out of Room ${updated.room.roomNumber}.`
      );
    }

    res.json({ success: true, booking: updated });
  } catch (e) {
    next(e);
  }
});

const paymentSchema = z.object({
  amount: z.coerce.number().positive(),
  method: z.enum(["CASH", "TELEBIRR", "CBE_BIRR", "BANK_TRANSFER", "CARD", "OTHER"]),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

router.post("/:id/payments", canRecordPayments, async (req: AuthRequest, res, next) => {
  try {
    const input = paymentSchema.parse(req.body);

    const activeShift = await prisma.shift.findFirst({
      where: { userId: req.user!.id, status: "OPEN" },
    });

    if (!activeShift) {
      return res.status(409).json({
        success: false,
        message: "You need an open shift before recording a payment. Clock in from the Shifts page first.",
      });
    }

    const booking = await prisma.booking.findUniqueOrThrow({
      where: { id: paramId(req) },
    });

    const newAmountPaid = Number(booking.amountPaid) + input.amount;
    const newBalance = Number(booking.totalAmount) - newAmountPaid;
    const paymentStatus = derivePaymentStatus(newAmountPaid, Number(booking.totalAmount));

    const receiptNumber = `PMT-${Date.now().toString().slice(-8)}`;

    const [payment] = await prisma.$transaction([
      prisma.payment.create({
        data: {
          receiptNumber,
          amount: input.amount,
          method: input.method,
          reference: input.reference,
          notes: input.notes,
          bookingId: booking.id,
          receivedById: req.user!.id,
          shiftId: activeShift.id,
        },
      }),
      prisma.booking.update({
        where: { id: booking.id },
        data: {
          amountPaid: newAmountPaid,
          balance: newBalance,
          paymentStatus,
        },
      }),
    ]);

    const updatedBooking = await prisma.booking.findUniqueOrThrow({
      where: { id: booking.id },
      include: includeRelations,
    });

    res.status(201).json({ success: true, payment, booking: updatedBooking });
  } catch (e) {
    next(e);
  }
});

router.delete("/:id", canManageBookings, async (req, res, next) => {
  try {
    const booking = await prisma.booking.findUniqueOrThrow({
      where: { id: paramId(req) },
    });

    await prisma.$transaction([
      prisma.booking.update({
        where: { id: paramId(req) },
        data: { status: "CANCELLED" },
      }),
      prisma.room.update({
        where: { id: booking.roomId },
        data: { status: "AVAILABLE" },
      }),
    ]);

    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

export default router;