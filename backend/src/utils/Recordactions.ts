import { prisma } from "../../prisma";

// An error the API shows to the person as it is (see the error handler in index.ts).
export class SafeError extends Error {
  status: number;
  safe = true;

  constructor(message: string, status = 409) {
    super(message);
    this.status = status;
  }
}

function derivePaymentStatus(paid: number, total: number): "PENDING" | "PARTIAL" | "PAID" {
  if (paid <= 0) return "PENDING";
  if (paid >= total) return "PAID";
  return "PARTIAL";
}

/**
 * Cancel a payment. The payment leaves the shift totals, the Z Report and the
 * reports. The booking balance goes back up. A linked bank SMS becomes
 * unmatched again. An audit log entry keeps who did it and why.
 */
export async function cancelPayment(paymentId: string, userId: string, reason: string) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { id: paymentId },
      include: { bankTransactionMatch: true, booking: true },
    });

    if (!payment) throw new SafeError("Payment not found.", 404);

    if (payment.bankTransactionMatch) {
      await tx.bankTransactionMatch.delete({ where: { id: payment.bankTransactionMatch.id } });
      await tx.bankTransaction.update({
        where: { id: payment.bankTransactionMatch.bankTransactionId },
        data: { status: "UNMATCHED" },
      });
    }

    const booking = payment.booking;
    const paid = Math.max(Number(booking.amountPaid) - Number(payment.amount), 0);
    const total = Number(booking.totalAmount);

    await tx.payment.delete({ where: { id: payment.id } });

    await tx.booking.update({
      where: { id: booking.id },
      data: {
        amountPaid: paid,
        balance: total - paid,
        paymentStatus: derivePaymentStatus(paid, total),
      },
    });

    await tx.auditLog.create({
      data: {
        action: "PAYMENT_CANCELLED",
        entity: "Payment",
        entityId: payment.id,
        userId,
        details: JSON.stringify({
          receiptNumber: payment.receiptNumber,
          amount: Number(payment.amount),
          method: payment.method,
          reference: payment.reference,
          bookingNumber: booking.bookingNumber,
          reason,
        }),
      },
    });

    return { bookingId: booking.id };
  });
}

/**
 * Change the amount of a payment. The booking balance follows. A linked bank
 * SMS with a different amount is unlinked.
 */
export async function adjustPaymentAmount(paymentId: string, userId: string, newAmount: number) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { id: paymentId },
      include: { bankTransactionMatch: { include: { bankTransaction: true } }, booking: true },
    });

    if (!payment) throw new SafeError("Payment not found.", 404);

    const oldAmount = Number(payment.amount);
    const booking = payment.booking;
    const paid = Math.max(Number(booking.amountPaid) - oldAmount + newAmount, 0);
    const total = Number(booking.totalAmount);

    const match = payment.bankTransactionMatch;

    if (match && Number(match.bankTransaction.amount) !== newAmount) {
      await tx.bankTransactionMatch.delete({ where: { id: match.id } });
      await tx.bankTransaction.update({
        where: { id: match.bankTransactionId },
        data: { status: "UNMATCHED" },
      });
    }

    await tx.payment.update({ where: { id: payment.id }, data: { amount: newAmount } });

    await tx.booking.update({
      where: { id: booking.id },
      data: {
        amountPaid: paid,
        balance: total - paid,
        paymentStatus: derivePaymentStatus(paid, total),
      },
    });

    await tx.auditLog.create({
      data: {
        action: "PAYMENT_EDITED",
        entity: "Payment",
        entityId: payment.id,
        userId,
        details: JSON.stringify({
          receiptNumber: payment.receiptNumber,
          from: oldAmount,
          to: newAmount,
          bookingNumber: booking.bookingNumber,
        }),
      },
    });
  });
}

/**
 * Delete a maintenance request. A room that stayed in maintenance only because
 * of this request goes back to Available.
 */
export async function deleteMaintenanceRequest(id: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const request = await tx.maintenanceRequest.findUnique({ where: { id } });

    if (!request) throw new SafeError("Maintenance request not found.", 404);

    await tx.maintenanceRequest.delete({ where: { id } });

    if (request.status === "OPEN" || request.status === "IN_PROGRESS") {
      const stillOpen = await tx.maintenanceRequest.count({
        where: { roomId: request.roomId, status: { in: ["OPEN", "IN_PROGRESS"] } },
      });

      const room = await tx.room.findUnique({ where: { id: request.roomId } });

      if (stillOpen === 0 && room?.status === "MAINTENANCE") {
        await tx.room.update({ where: { id: room.id }, data: { status: "AVAILABLE" } });
      }
    }

    await tx.auditLog.create({
      data: {
        action: "MAINTENANCE_DELETED",
        entity: "MaintenanceRequest",
        entityId: id,
        userId,
        details: JSON.stringify({ title: request.title, cost: Number(request.cost) }),
      },
    });
  });
}