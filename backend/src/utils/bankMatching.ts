import { prisma } from "../../prisma";

// Payment methods that leave a bank or mobile-money SMS.
export const BANK_METHODS = ["BANK_TRANSFER", "TELEBIRR", "CBE_BIRR"] as const;

// How far apart a payment and its SMS may be.
const WINDOW_MS = 48 * 60 * 60 * 1000;

function sameReference(a?: string | null, b?: string | null) {
  return !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();
}

function referencesConflict(a?: string | null, b?: string | null) {
  return !!a && !!b && !sameReference(a, b);
}

async function link(
  transactionId: string,
  payment: { id: string; shiftId: string | null; bankAccountId: string | null },
  bankAccountId: string | null
): Promise<boolean> {
  try {
    await prisma.$transaction(async (tx) => {
      await tx.bankTransactionMatch.create({
        data: {
          bankTransactionId: transactionId,
          paymentId: payment.id,
          shiftId: payment.shiftId,
        },
      });

      await tx.bankTransaction.update({
        where: { id: transactionId },
        data: { status: "MATCHED" },
      });

      // Record which bank account really received the money.
      if (!payment.bankAccountId && bankAccountId) {
        await tx.payment.update({
          where: { id: payment.id },
          data: { bankAccountId },
        });
      }
    });

    return true;
  } catch {
    // A unique rule stopped a double match. Treat it as not matched.
    return false;
  }
}

/**
 * An SMS arrived. Look for a bank payment that staff already recorded.
 * A reference match wins. Otherwise the amount must point to exactly one payment.
 */
export async function tryMatchTransaction(transactionId: string): Promise<boolean> {
  const transaction = await prisma.bankTransaction.findUnique({
    where: { id: transactionId },
  });

  if (
    !transaction ||
    transaction.status !== "UNMATCHED" ||
    transaction.transactionType !== "CREDIT"
  ) {
    return false;
  }

  const since = new Date(transaction.receivedAt.getTime() - WINDOW_MS);

  const found = await prisma.payment.findMany({
    where: {
      method: { in: [...BANK_METHODS] },
      bankTransactionMatch: null,
      amount: transaction.amount,
      createdAt: { gte: since },
      OR: transaction.bankAccountId
        ? [{ bankAccountId: null }, { bankAccountId: transaction.bankAccountId }]
        : [{ bankAccountId: null }],
    },
    orderBy: { createdAt: "asc" },
  });

  const candidates = found.filter(
    (payment) => !referencesConflict(payment.reference, transaction.transactionReference)
  );

  const byReference = candidates.find((payment) =>
    sameReference(payment.reference, transaction.transactionReference)
  );

  const chosen = byReference || (candidates.length === 1 ? candidates[0] : undefined);

  if (!chosen) return false;

  return link(transaction.id, chosen, transaction.bankAccountId);
}

/**
 * Staff just recorded a bank payment. Look for an SMS that arrived earlier.
 */
export async function tryMatchPayment(paymentId: string): Promise<boolean> {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { bankTransactionMatch: true },
    });

    if (
      !payment ||
      payment.bankTransactionMatch ||
      !(BANK_METHODS as readonly string[]).includes(payment.method)
    ) {
      return false;
    }

    const since = new Date(payment.createdAt.getTime() - WINDOW_MS);

    const found = await prisma.bankTransaction.findMany({
      where: {
        status: "UNMATCHED",
        transactionType: "CREDIT",
        amount: payment.amount,
        receivedAt: { gte: since },
        ...(payment.bankAccountId ? { bankAccountId: payment.bankAccountId } : {}),
      },
      orderBy: { receivedAt: "asc" },
    });

    const candidates = found.filter(
      (transaction) => !referencesConflict(payment.reference, transaction.transactionReference)
    );

    const byReference = candidates.find((transaction) =>
      sameReference(payment.reference, transaction.transactionReference)
    );

    const chosen = byReference || (candidates.length === 1 ? candidates[0] : undefined);

    if (!chosen) return false;

    return link(chosen.id, payment, chosen.bankAccountId);
  } catch {
    return false;
  }
}