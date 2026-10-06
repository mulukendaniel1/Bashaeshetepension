import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../prisma";
import { requireAuth, requireRoles } from "../middleware/auth";
import { UserRole } from "../generated/prisma/enums";
import { serializeDecimals } from "../utils/decimal";
import { parseSms } from "../utils/smsParser";

const router = Router();
router.use(requireAuth);

function paramId(req: { params: Record<string, string | string[] | undefined> }): string {
  const value = req.params.id;
  return Array.isArray(value) ? value[0] : (value as string);
}

const canManage = requireRoles(UserRole.OWNER, UserRole.MANAGER);

const accountSchema = z.object({
  name: z.string().min(1),
  bankName: z.string().min(1),
  accountNumberMasked: z.string().min(1),
  accountIdentifier: z.string().min(1),
  accountType: z.enum(["PENSION", "PERSONAL"]),
  active: z.boolean().optional(),
});

router.get("/", async (_req, res, next) => {
  try {
    const accounts = await prisma.bankAccount.findMany({
      include: { smsRules: true },
      orderBy: { name: "asc" },
    });

    res.json({ success: true, accounts: serializeDecimals(accounts) });
  } catch (e) {
    next(e);
  }
});

router.post("/", canManage, async (req, res, next) => {
  try {
    const input = accountSchema.parse(req.body);
    const account = await prisma.bankAccount.create({ data: input });
    res.status(201).json({ success: true, account });
  } catch (e) {
    next(e);
  }
});

router.patch("/:id", canManage, async (req, res, next) => {
  try {
    const account = await prisma.bankAccount.update({
      where: { id: paramId(req) },
      data: accountSchema.partial().parse(req.body),
    });

    res.json({ success: true, account });
  } catch (e) {
    next(e);
  }
});

router.delete("/:id", canManage, async (req, res, next) => {
  try {
    await prisma.bankAccount.delete({ where: { id: paramId(req) } });
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

const ruleSchema = z.object({
  bankAccountId: z.string().min(1),
  bankName: z.string().min(1),
  smsSender: z.string().min(1),
  enabled: z.boolean().optional(),
  amountPattern: z.string().min(1).max(200),
  accountPattern: z.string().max(200).optional(),
  referencePattern: z.string().max(200).optional(),
  datePattern: z.string().max(200).optional(),
  transactionTypePattern: z.string().max(200).optional(),
  creditKeywords: z.string().min(1),
  debitKeywords: z.string().optional(),
});

router.get("/rules", async (_req, res, next) => {
  try {
    const rules = await prisma.bankSmsRule.findMany({
      include: { bankAccount: { select: { id: true, name: true, accountType: true } } },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, rules });
  } catch (e) {
    next(e);
  }
});

router.post("/rules", canManage, async (req, res, next) => {
  try {
    const input = ruleSchema.parse(req.body);
    const rule = await prisma.bankSmsRule.create({
      data: input,
      include: { bankAccount: { select: { id: true, name: true, accountType: true } } },
    });

    res.status(201).json({ success: true, rule });
  } catch (e) {
    next(e);
  }
});

router.patch("/rules/:id", canManage, async (req, res, next) => {
  try {
    const rule = await prisma.bankSmsRule.update({
      where: { id: paramId(req) },
      data: ruleSchema.partial().parse(req.body),
      include: { bankAccount: { select: { id: true, name: true, accountType: true } } },
    });

    res.json({ success: true, rule });
  } catch (e) {
    next(e);
  }
});

router.delete("/rules/:id", canManage, async (req, res, next) => {
  try {
    await prisma.bankSmsRule.delete({ where: { id: paramId(req) } });
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

const testSchema = z.object({
  text: z.string().min(1).max(2000),
  ruleId: z.string().min(1),
});

// Owner-only sandbox: paste a sample SMS, see exactly what a saved rule
// would extract from it, with zero risk of creating a real transaction.
router.post("/rules/test", requireRoles(UserRole.OWNER), async (req, res, next) => {
  try {
    const { text, ruleId } = testSchema.parse(req.body);

    const rule = await prisma.bankSmsRule.findUniqueOrThrow({ where: { id: ruleId } });

    const result = parseSms(text, rule);

    res.json({ success: true, result });
  } catch (e) {
    next(e);
  }
});

export default router;