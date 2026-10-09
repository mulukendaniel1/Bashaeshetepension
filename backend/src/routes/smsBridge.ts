import crypto from "crypto";
import express, { Router } from "express";
import { z } from "zod";
import { prisma } from "../../prisma";
import { requireAuth, requireRoles } from "../middleware/auth";
import { UserRole } from "../generated/prisma/enums";
import { serializeDecimals } from "../utils/decimal";
import { isAutoQueueable, parseSms } from "../utils/smsParser";
import { BANK_METHODS, tryMatchTransaction } from "../utils/bankMatching";

const router = Router();

function paramId(req: { params: Record<string, string | string[] | undefined> }): string {
  const value = req.params.id;
  return Array.isArray(value) ? value[0] : (value as string);
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function sha256(text: string) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function firstString(value: unknown): string {
  if (Array.isArray(value)) return firstString(value[0]);
  return typeof value === "string" ? value : "";
}

/**
 * Reads MacroDroid's request in any of three shapes:
 * 1. text/plain body with the SMS text, plus ?sender=... or an X-Sms-Sender header
 * 2. JSON with sender and message
 * 3. form fields with sender and message
 */
function readPayload(req: express.Request) {
  let sender = "";
  let message = "";

  if (typeof req.body === "string") {
    message = req.body;
    sender = firstString(req.query.sender) || firstString(req.header("x-sms-sender"));
  } else if (req.body && typeof req.body === "object") {
    const body = req.body as Record<string, unknown>;
    message = firstString(body.message ?? body.text ?? body.body ?? body.sms);
    sender =
      firstString(body.sender ?? body.from ?? body.number) ||
      firstString(req.query.sender) ||
      firstString(req.header("x-sms-sender"));
  }

  return { sender: sender.trim().slice(0, 100), message: message.trim() };
}

// Optional rule check. If the owner set an account pattern (for example the last
// digits of the account), the SMS must match it. This separates two accounts
// that share the same sender ID.
function accountMatches(pattern: string | null, text: string) {
  if (!pattern) return true;
  if (pattern.length > 200) return false;

  try {
    return new RegExp(pattern, "i").test(text);
  } catch {
    return false;
  }
}

function senderMatches(ruleSender: string, sender: string) {
  const rule = ruleSender.trim().toLowerCase();
  const incoming = sender.trim().toLowerCase();

  if (!rule || !incoming) return false;
  if (rule === incoming) return true;

  return rule.length >= 3 && incoming.includes(rule);
}

// ---------------------------------------------------------------------------
// Public endpoint for MacroDroid. It uses a device token, not a user login.
// ---------------------------------------------------------------------------
router.post(
  "/ingest",
  express.text({ type: "text/plain", limit: "20kb" }),
  express.urlencoded({ extended: false, limit: "20kb" }),
  async (req, res, next) => {
    try {
      const token = (req.header("x-device-token") || "").trim();

      if (!token) {
        return res.status(401).json({ success: false, message: "Missing device token." });
      }

      const device = await prisma.smsBridgeDevice.findUnique({
        where: { tokenHash: hashToken(token) },
      });

      if (!device || device.status !== "ACTIVE") {
        return res.status(401).json({ success: false, message: "Invalid device token." });
      }

      const { sender, message } = readPayload(req);

      await prisma.smsBridgeDevice.update({
        where: { id: device.id },
        data: { lastSeenAt: new Date(), lastIp: req.ip || null },
      });

      if (!sender || !message || message.length > 2000) {
        return res.status(400).json({
          success: false,
          message: "Both the sender and the message text are required.",
        });
      }

      const rules = await prisma.bankSmsRule.findMany({
        where: { enabled: true, bankAccount: { active: true } },
      });

      const candidates = rules.filter(
        (rule) =>
          senderMatches(rule.smsSender, sender) && accountMatches(rule.accountPattern, message)
      );

      if (candidates.length === 0) {
        // Not a bank SMS we watch. Nothing is stored.
        return res.json({ success: true, status: "IGNORED", reason: "No rule for this sender." });
      }

      const parsedList = candidates.map((rule) => ({ rule, parsed: parseSms(message, rule) }));

      const hit =
        parsedList.find(
          (item) => item.parsed.transactionType === "CREDIT" && isAutoQueueable(item.parsed)
        ) ||
        parsedList.find((item) => item.parsed.transactionType === "CREDIT") ||
        parsedList.find((item) => item.parsed.transactionType === "DEBIT");

      if (!hit) {
        // OTP, marketing and unclear messages are never stored.
        return res.json({ success: true, status: "IGNORED", reason: "Not a transaction SMS." });
      }

      const { rule, parsed } = hit;
      const type = parsed.transactionType as "CREDIT" | "DEBIT";
      const amount = parsed.amount ?? 0;

      const status =
        type === "DEBIT" ? "DETECTED" : isAutoQueueable(parsed) ? "UNMATCHED" : "REVIEW_REQUIRED";

      const normalizedText = message.replace(/\s+/g, " ").toLowerCase();

      const fingerprint = sha256(
        parsed.reference
          ? `${rule.bankAccountId}|${parsed.reference.toLowerCase()}|${amount}`
          : `${rule.bankAccountId}|${normalizedText}`
      );

      const existing = await prisma.bankTransaction.findUnique({ where: { fingerprint } });

      if (existing) {
        return res.json({ success: true, status: "DUPLICATE" });
      }

      let created;

      try {
        created = await prisma.bankTransaction.create({
          data: {
            amount,
            transactionReference: parsed.reference,
            sender,
            smsText: message,
            transactionType: type,
            transactionDate: parsed.transactionDate,
            receivedAt: new Date(),
            confidence: parsed.confidence,
            status,
            fingerprint,
            bankAccountId: rule.bankAccountId,
            deviceId: device.id,
          },
        });
      } catch (e: any) {
        // Two identical SMS arrived at the same moment.
        if (e?.code === "P2002") {
          return res.json({ success: true, status: "DUPLICATE" });
        }

        throw e;
      }

      await prisma.smsBridgeDevice.update({
        where: { id: device.id },
        data: { lastSmsAt: new Date() },
      });

      let finalStatus: string = status;

      if (status === "UNMATCHED") {
        const matched = await tryMatchTransaction(created.id);
        if (matched) finalStatus = "MATCHED";
      }

      return res.status(201).json({
        success: true,
        status: finalStatus,
        transactionId: created.id,
      });
    } catch (e) {
      next(e);
    }
  }
);

// ---------------------------------------------------------------------------
// Everything below needs a logged-in user.
// ---------------------------------------------------------------------------
router.use(requireAuth);

const canReview = requireRoles(UserRole.OWNER, UserRole.MANAGER, UserRole.ACCOUNTANT);
const ownerOnly = requireRoles(UserRole.OWNER);

const transactionInclude = {
  bankAccount: { select: { id: true, name: true, accountType: true } },
  match: {
    include: {
      payment: {
        include: {
          booking: {
            select: {
              bookingNumber: true,
              guest: { select: { fullName: true } },
              room: { select: { roomNumber: true } },
            },
          },
        },
      },
    },
  },
};

router.get("/transactions", canReview, async (req, res, next) => {
  try {
    const status = req.query.status ? String(req.query.status) : undefined;

    const transactions = await prisma.bankTransaction.findMany({
      where: status ? { status: status as any } : undefined,
      include: transactionInclude,
      orderBy: { receivedAt: "desc" },
      take: 200,
    });

    res.json({ success: true, transactions: serializeDecimals(transactions) });
  } catch (e) {
    next(e);
  }
});

// Bank payments that staff recorded and no SMS has verified yet.
router.get("/unverified-payments", canReview, async (_req, res, next) => {
  try {
    const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    const payments = await prisma.payment.findMany({
      where: {
        method: { in: [...BANK_METHODS] },
        bankTransactionMatch: null,
        createdAt: { gte: since },
      },
      include: {
        booking: {
          select: {
            bookingNumber: true,
            guest: { select: { fullName: true } },
            room: { select: { roomNumber: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, payments: serializeDecimals(payments) });
  } catch (e) {
    next(e);
  }
});

const matchSchema = z.object({ paymentId: z.string().min(1) });

router.post("/transactions/:id/match", canReview, async (req, res, next) => {
  try {
    const { paymentId } = matchSchema.parse(req.body);
    const id = paramId(req);

    const transaction = await prisma.bankTransaction.findUniqueOrThrow({ where: { id } });
    const payment = await prisma.payment.findUniqueOrThrow({
      where: { id: paymentId },
      include: { bankTransactionMatch: true },
    });

    if (transaction.status !== "UNMATCHED" && transaction.status !== "REVIEW_REQUIRED") {
      return res.status(409).json({
        success: false,
        message: "This SMS is not waiting for a match.",
      });
    }

    if (transaction.transactionType !== "CREDIT") {
      return res.status(409).json({ success: false, message: "Only money received can be matched." });
    }

    if (payment.bankTransactionMatch) {
      return res.status(409).json({
        success: false,
        message: "This payment already has a verified SMS.",
      });
    }

    if (Number(transaction.amount) !== Number(payment.amount)) {
      return res.status(409).json({
        success: false,
        message: `The amounts differ. The SMS shows ${Number(transaction.amount).toLocaleString()} ETB and the payment shows ${Number(payment.amount).toLocaleString()} ETB.`,
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.bankTransactionMatch.create({
        data: {
          bankTransactionId: transaction.id,
          paymentId: payment.id,
          shiftId: payment.shiftId,
        },
      });

      await tx.bankTransaction.update({ where: { id: transaction.id }, data: { status: "MATCHED" } });

      if (!payment.bankAccountId && transaction.bankAccountId) {
        await tx.payment.update({
          where: { id: payment.id },
          data: { bankAccountId: transaction.bankAccountId },
        });
      }
    });

    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

router.post("/transactions/:id/rematch", canReview, async (req, res, next) => {
  try {
    const matched = await tryMatchTransaction(paramId(req));
    res.json({ success: true, matched });
  } catch (e) {
    next(e);
  }
});

router.post("/transactions/:id/reject", canReview, async (req, res, next) => {
  try {
    const id = paramId(req);
    const transaction = await prisma.bankTransaction.findUniqueOrThrow({ where: { id } });

    if (transaction.status === "MATCHED") {
      return res.status(409).json({
        success: false,
        message: "Unmatch this SMS first, then reject it.",
      });
    }

    await prisma.bankTransaction.update({ where: { id }, data: { status: "REJECTED" } });
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

router.post("/transactions/:id/unmatch", ownerOnly, async (req, res, next) => {
  try {
    const id = paramId(req);

    await prisma.$transaction(async (tx) => {
      await tx.bankTransactionMatch.delete({ where: { bankTransactionId: id } });
      await tx.bankTransaction.update({ where: { id }, data: { status: "UNMATCHED" } });
    });

    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

// ---------------------------------------------------------------------------
// Phones that send SMS to the system. Owner only.
// ---------------------------------------------------------------------------
const deviceSelect = {
  id: true,
  label: true,
  status: true,
  lastSeenAt: true,
  lastSmsAt: true,
  createdAt: true,
};

router.get("/devices", ownerOnly, async (_req, res, next) => {
  try {
    const devices = await prisma.smsBridgeDevice.findMany({
      select: deviceSelect,
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, devices });
  } catch (e) {
    next(e);
  }
});

const deviceSchema = z.object({ label: z.string().trim().min(1).max(60) });

router.post("/devices", ownerOnly, async (req, res, next) => {
  try {
    const { label } = deviceSchema.parse(req.body);

    // The token is shown once. Only its hash is stored.
    const token = `bsb_${crypto.randomBytes(24).toString("hex")}`;

    const device = await prisma.smsBridgeDevice.create({
      data: { label, tokenHash: hashToken(token) },
      select: deviceSelect,
    });

    res.status(201).json({ success: true, device, token });
  } catch (e) {
    next(e);
  }
});

router.patch("/devices/:id/revoke", ownerOnly, async (req, res, next) => {
  try {
    const device = await prisma.smsBridgeDevice.update({
      where: { id: paramId(req) },
      data: { status: "REVOKED" },
      select: deviceSelect,
    });

    res.json({ success: true, device });
  } catch (e) {
    next(e);
  }
});

export default router;