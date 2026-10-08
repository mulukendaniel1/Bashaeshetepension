import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../prisma";
import { requireAuth, requireRoles, AuthRequest } from "../middleware/auth";
import { UserRole } from "../generated/prisma/enums";
import { serializeDecimals } from "../utils/decimal";

const router = Router();
router.use(requireAuth);

function paramId(req: { params: Record<string, string | string[] | undefined> }): string {
  const value = req.params.id;
  return Array.isArray(value) ? value[0] : (value as string);
}

const includeRelations = {
  user: { select: { id: true, fullName: true, role: true } },
};

// The currently authenticated user's open shift, if any. Every receptionist
// workflow (recording a payment, matching a bank transaction) asks this
// first to know which shift to attach the record to.
router.get("/active", async (req: AuthRequest, res, next) => {
  try {
    const shift = await prisma.shift.findFirst({
      where: { userId: req.user!.id, status: "OPEN" },
      include: includeRelations,
    });

    res.json({ success: true, shift: shift ? serializeDecimals(shift) : null });
  } catch (e) {
    next(e);
  }
});

// Owner/Manager view of every currently open shift across all staff.
router.get(
  "/open",
  requireRoles(UserRole.OWNER, UserRole.MANAGER),
  async (_req, res, next) => {
    try {
      const shifts = await prisma.shift.findMany({
        where: { status: "OPEN" },
        include: includeRelations,
        orderBy: { openedAt: "desc" },
      });

      res.json({ success: true, shifts: serializeDecimals(shifts) });
    } catch (e) {
      next(e);
    }
  }
);

router.get("/", async (req: AuthRequest, res, next) => {
  try {
    const mine = req.query.mine === "true";
    const isPrivileged = req.user?.role === UserRole.OWNER || req.user?.role === UserRole.MANAGER;

    // Optional date range. "from" is included, "to" is excluded.
    const fromDate = req.query.from ? new Date(String(req.query.from)) : undefined;
    const toDate = req.query.to ? new Date(String(req.query.to)) : undefined;
    const from = fromDate && !Number.isNaN(fromDate.getTime()) ? fromDate : undefined;
    const to = toDate && !Number.isNaN(toDate.getTime()) ? toDate : undefined;

    const shifts = await prisma.shift.findMany({
      where: {
        ...(mine || !isPrivileged ? { userId: req.user!.id } : {}),
        ...(from || to
          ? {
              openedAt: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lt: to } : {}),
              },
            }
          : {}),
      },
      include: includeRelations,
      orderBy: { openedAt: "desc" },
      take: from || to ? 500 : 100,
    });

    res.json({ success: true, shifts: serializeDecimals(shifts) });
  } catch (e) {
    next(e);
  }
});

router.get("/:id", async (req: AuthRequest, res, next) => {
  try {
    const shift = await prisma.shift.findUniqueOrThrow({
      where: { id: paramId(req) },
      include: includeRelations,
    });

    const isOwnerOrManager = req.user?.role === UserRole.OWNER || req.user?.role === UserRole.MANAGER;

    if (!isOwnerOrManager && shift.userId !== req.user?.id) {
      return res.status(403).json({ success: false, message: "You can only view your own shifts." });
    }

    res.json({ success: true, shift: serializeDecimals(shift) });
  } catch (e) {
    next(e);
  }
});

const openSchema = z.object({
  label: z.string().min(1),
  openingCash: z.coerce.number().nonnegative().default(0),
});

router.post("/open", async (req: AuthRequest, res, next) => {
  try {
    const input = openSchema.parse(req.body);

    const existing = await prisma.shift.findFirst({
      where: { userId: req.user!.id, status: "OPEN" },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "You already have an open shift. Close it before starting a new one.",
      });
    }

    const shift = await prisma.shift.create({
      data: {
        label: input.label,
        openingCash: input.openingCash,
        userId: req.user!.id,
      },
      include: includeRelations,
    });

    res.status(201).json({ success: true, shift: serializeDecimals(shift) });
  } catch (e) {
    next(e);
  }
});

const closeSchema = z.object({
  closingCash: z.coerce.number().nonnegative(),
  notes: z.string().optional(),
});

router.post("/:id/close", async (req: AuthRequest, res, next) => {
  try {
    const id = paramId(req);
    const input = closeSchema.parse(req.body);

    const shift = await prisma.shift.findUniqueOrThrow({ where: { id } });

    const isOwnerOrManager = req.user?.role === UserRole.OWNER || req.user?.role === UserRole.MANAGER;

    if (!isOwnerOrManager && shift.userId !== req.user?.id) {
      return res.status(403).json({ success: false, message: "You can only close your own shift." });
    }

    if (shift.status === "CLOSED") {
      return res.status(409).json({ success: false, message: "This shift is already closed." });
    }

    const updated = await prisma.shift.update({
      where: { id },
      data: {
        status: "CLOSED",
        closedAt: new Date(),
        closingCash: input.closingCash,
        notes: input.notes,
      },
      include: includeRelations,
    });

    res.json({ success: true, shift: serializeDecimals(updated) });
  } catch (e) {
    next(e);
  }
});

export default router;