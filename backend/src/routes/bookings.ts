import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../prisma";
import type { Prisma } from "../generated/prisma/client";
import { requireAuth, requireRoles, AuthRequest } from "../middleware/auth";

import { UserRole } from "../generated/prisma/enums";
import { tryMatchPayment } from "../utils/bankMatching";
import { cancelPayment } from "../utils/Recordactions";

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
  bankAccountId: z.string().optional(),
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
          bankAccountId: input.bankAccountId || undefined,
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

    // Bank payments are checked against the bank SMS that already arrived.
    const verifiedBySms = await tryMatchPayment(payment.id);

    const updatedBooking = await prisma.booking.findUniqueOrThrow({
      where: { id: booking.id },
      include: includeRelations,
    });

    res.status(201).json({ success: true, payment, booking: updatedBooking, verifiedBySms });
  } catch (e) {
    next(e);
  }
});

const ACTIVE_STATUSES = ["PENDING", "CONFIRMED", "CHECKED_IN"] as const;

// The room is freed only when no other active booking holds it.
async function freeRoomIfUnused(tx: Prisma.TransactionClient, roomId: string, exceptBookingId: string) {
  const others = await tx.booking.count({
    where: { roomId, id: { not: exceptBookingId }, status: { in: [...ACTIVE_STATUSES] } },
  });

  const room = await tx.room.findUnique({ where: { id: roomId } });

  if (others === 0 && room?.status === "RESERVED") {
    await tx.room.update({ where: { id: roomId }, data: { status: "AVAILABLE" } });
  }
}

const cancelSchema = z.object({
  reason: z.string().trim().max(200).optional(),
  // The owner or a manager may cancel the payments of the booking in the same step.
  cancelPayments: z.boolean().optional(),
});

// Cancel a booking that has not checked in. The booking stays in the list as Cancelled.
router.post("/:id/cancel", canManageBookings, async (req: AuthRequest, res, next) => {
  try {
    const { reason, cancelPayments } = cancelSchema.parse(req.body);
    const id = paramId(req);

    const booking = await prisma.booking.findUniqueOrThrow({ where: { id } });

    if (booking.status !== "PENDING" && booking.status !== "CONFIRMED") {
      return res.status(409).json({
        success: false,
        message: "Only a booking that has not checked in can be cancelled.",
      });
    }

    if (Number(booking.amountPaid) > 0) {
      if (!cancelPayments) {
        return res.status(409).json({
          success: false,
          message: "This booking has payments. Cancel the payments first, then cancel the booking.",
        });
      }

      if (req.user?.role !== "OWNER" && req.user?.role !== "MANAGER") {
        return res.status(403).json({
          success: false,
          message: "Only the owner or a manager can cancel a booking that has payments.",
        });
      }

      // Each payment leaves the shift totals and the Z Report. The audit log keeps the reason.
      const payments = await prisma.payment.findMany({
        where: { bookingId: id },
        select: { id: true },
      });

      for (const payment of payments) {
        await cancelPayment(
          payment.id,
          req.user!.id,
          `Booking ${booking.bookingNumber} cancelled${reason ? `: ${reason}` : ""}`
        );
      }
    }

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.booking.update({
        where: { id },
        data: {
          status: "CANCELLED",
          notes: reason
            ? `${booking.notes ? `${booking.notes}. ` : ""}Cancelled: ${reason}`
            : booking.notes,
        },
      });

      await freeRoomIfUnused(tx, booking.roomId, id);

      await tx.auditLog.create({
        data: {
          action: "BOOKING_CANCELLED",
          entity: "Booking",
          entityId: id,
          userId: req.user!.id,
          details: JSON.stringify({ bookingNumber: booking.bookingNumber, reason: reason || null }),
        },
      });
    });

    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

const extendSchema = z.object({ days: z.coerce.number().int().min(1).max(60) });

// Add days to a stay. The price per night stays the same. The total and the balance grow.
router.patch("/:id/extend", canManageBookings, async (req: AuthRequest, res, next) => {
  try {
    const { days } = extendSchema.parse(req.body);
    const id = paramId(req);

    const booking = await prisma.booking.findUniqueOrThrow({
      where: { id },
      include: { guest: true, room: true },
    });

    if (!["PENDING", "CONFIRMED", "CHECKED_IN"].includes(booking.status)) {
      return res.status(409).json({
        success: false,
        message: "Only an active booking can be extended.",
      });
    }

    const oldCheckOut = booking.checkOutDate;
    const newCheckOut = new Date(oldCheckOut.getTime() + days * 24 * 60 * 60 * 1000);

    // The room must be free for the extra days.
    const clash = await prisma.booking.findFirst({
      where: {
        roomId: booking.roomId,
        id: { not: id },
        status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN"] },
        checkInDate: { lt: newCheckOut },
        checkOutDate: { gt: oldCheckOut },
      },
      include: { guest: { select: { fullName: true } } },
      orderBy: { checkInDate: "asc" },
    });

    if (clash) {
      return res.status(409).json({
        success: false,
        message: `Room ${booking.room.roomNumber} is already booked from ${clash.checkInDate
          .toISOString()
          .slice(0, 10)} for ${clash.guest.fullName}. Extend by fewer days or move the guest.`,
      });
    }

    const nights = nightsBetween(booking.checkInDate, newCheckOut);
    const pricePerNight = Number(booking.pricePerNight);
    const subtotal = pricePerNight * nights;
    const totalAmount =
      subtotal - Number(booking.discount) + Number(booking.tax) + Number(booking.additionalFees);
    const amountPaid = Number(booking.amountPaid);

    const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const result = await tx.booking.update({
        where: { id },
        data: {
          checkOutDate: newCheckOut,
          nights,
          subtotal,
          totalAmount,
          balance: totalAmount - amountPaid,
          paymentStatus: derivePaymentStatus(amountPaid, totalAmount),
        },
        include: includeRelations,
      });

      await tx.auditLog.create({
        data: {
          action: "BOOKING_EXTENDED",
          entity: "Booking",
          entityId: id,
          userId: req.user!.id,
          details: JSON.stringify({
            bookingNumber: booking.bookingNumber,
            days,
            from: oldCheckOut.toISOString().slice(0, 10),
            to: newCheckOut.toISOString().slice(0, 10),
            extra: pricePerNight * days,
          }),
        },
      });

      return result;
    });

    res.json({ success: true, booking: updated });
  } catch (e) {
    next(e);
  }
});

const guestChangeSchema = z.object({
  guestId: z.string().min(1).optional(),
  fullName: z.string().trim().min(2).max(80).optional(),
  phone: z.string().trim().min(3).max(30).optional(),
  email: z.string().trim().email().max(120).optional().or(z.literal("")),
  nationality: z.string().trim().max(60).optional(),
  idNumber: z.string().trim().max(40).optional(),
});

// Give a booking to another guest. Example: one person reserved three rooms,
// then the real guests arrive. Each room goes to its own guest.
router.patch("/:id/guest", canManageBookings, async (req: AuthRequest, res, next) => {
  try {
    const input = guestChangeSchema.parse(req.body);
    const id = paramId(req);

    const booking = await prisma.booking.findUniqueOrThrow({
      where: { id },
      include: { guest: true },
    });

    if (!["PENDING", "CONFIRMED", "CHECKED_IN"].includes(booking.status)) {
      return res.status(409).json({
        success: false,
        message: "Only an active booking can change its guest.",
      });
    }

    let guestId = input.guestId;

    if (!guestId) {
      if (!input.fullName || !input.phone) {
        return res.status(400).json({
          success: false,
          message: "Choose a guest, or enter the full name and the phone number of a new guest.",
        });
      }

      const created = await prisma.guest.create({
        data: {
          fullName: input.fullName,
          phone: input.phone,
          email: input.email || undefined,
          nationality: input.nationality || undefined,
          idNumber: input.idNumber || undefined,
        },
      });

      guestId = created.id;
    }

    if (guestId === booking.guestId) {
      return res.status(409).json({
        success: false,
        message: "This booking already belongs to that guest.",
      });
    }

    const newGuest = await prisma.guest.findUniqueOrThrow({ where: { id: guestId } });

    const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const result = await tx.booking.update({
        where: { id },
        data: { guestId },
        include: includeRelations,
      });

      await tx.auditLog.create({
        data: {
          action: "BOOKING_GUEST_CHANGED",
          entity: "Booking",
          entityId: id,
          userId: req.user!.id,
          details: JSON.stringify({
            bookingNumber: booking.bookingNumber,
            from: booking.guest.fullName,
            to: newGuest.fullName,
          }),
        },
      });

      return result;
    });

    res.json({ success: true, booking: updated });
  } catch (e) {
    next(e);
  }
});

// Delete a booking for good. Owner and manager only.
// A booking with payments or a guest in the room cannot be deleted.
router.delete("/:id", requireRoles(UserRole.OWNER, UserRole.MANAGER), async (req: AuthRequest, res, next) => {
  try {
    const id = paramId(req);

    const booking = await prisma.booking.findUniqueOrThrow({ where: { id } });

    if (booking.status === "CHECKED_IN") {
      return res.status(409).json({
        success: false,
        message: "The guest is checked in. Check the guest out or cancel the stay first.",
      });
    }

    const payments = await prisma.payment.count({ where: { bookingId: id } });

    if (payments > 0) {
      return res.status(409).json({
        success: false,
        message: "This booking has payments. Cancel the payments first, then delete the booking.",
      });
    }

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.booking.delete({ where: { id } });

      await freeRoomIfUnused(tx, booking.roomId, id);

      await tx.auditLog.create({
        data: {
          action: "BOOKING_DELETED",
          entity: "Booking",
          entityId: id,
          userId: req.user!.id,
          details: JSON.stringify({ bookingNumber: booking.bookingNumber, status: booking.status }),
        },
      });
    });

    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

export default router;