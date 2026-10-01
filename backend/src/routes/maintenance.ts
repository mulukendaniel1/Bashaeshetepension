import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../prisma";
import type { Prisma } from "../generated/prisma/client";
import { serializeDecimals } from "../utils/decimal";
import { requireAuth, requireRoles, AuthRequest } from "../middleware/auth";
import { UserRole } from "../generated/prisma/enums";

const router = Router();
router.use(requireAuth);

const canCreateRequests = requireRoles(UserRole.OWNER, UserRole.MANAGER, UserRole.RECEPTIONIST);

function paramId(req: { params: Record<string, string | string[] | undefined> }): string {
  const value = req.params.id;
  return Array.isArray(value) ? value[0] : (value as string);
}

const requestSchema = z.object({
  roomId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  assignedToId: z.string().optional(),
  cost: z.coerce.number().nonnegative().default(0),
});

const includeRelations = {
  room: { include: { roomType: true } },
  assignedTo: { select: { id: true, fullName: true } },
};

router.get("/", async (req, res, next) => {
  try {
    const status = req.query.status ? String(req.query.status) : undefined;

    const requests = await prisma.maintenanceRequest.findMany({
      where: status ? { status: status as any } : undefined,
      include: includeRelations,
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, requests: serializeDecimals(requests) });
  } catch (e) {
    next(e);
  }
});

router.post("/", canCreateRequests, async (req, res, next) => {
  try {
    const input = requestSchema.parse(req.body);

    const request = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const created = await tx.maintenanceRequest.create({
        data: { ...input, status: "OPEN" },
        include: includeRelations,
      });

      await tx.room.update({
        where: { id: input.roomId },
        data: { status: "MAINTENANCE" },
      });

      return created;
    });

    res.status(201).json({ success: true, request: serializeDecimals(request) });
  } catch (e) {
    next(e);
  }
});

const statusSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"]),
  cost: z.coerce.number().nonnegative().optional(),
});

router.patch("/:id/status", async (req: AuthRequest, res, next) => {
  try {
    const { status, cost } = statusSchema.parse(req.body);
    const id = paramId(req);

    const request = await prisma.maintenanceRequest.findUniqueOrThrow({ where: { id } });

    const isPrivileged =
      req.user?.role === UserRole.OWNER ||
      req.user?.role === UserRole.MANAGER ||
      req.user?.role === UserRole.RECEPTIONIST;
    const isOwnRequest = request.assignedToId === req.user?.id;

    if (!isPrivileged && !isOwnRequest) {
      return res.status(403).json({
        success: false,
        message: "You can only update maintenance requests assigned to you.",
      });
    }

    const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const result = await tx.maintenanceRequest.update({
        where: { id },
        data: {
          status,
          cost: cost ?? undefined,
          completedAt: status === "COMPLETED" ? new Date() : undefined,
        },
        include: includeRelations,
      });

      if (status === "COMPLETED" || status === "CANCELLED") {
        await tx.room.update({
          where: { id: request.roomId },
          data: { status: "AVAILABLE" },
        });
      }

      return result;
    });

    res.json({ success: true, request: serializeDecimals(updated) });
  } catch (e) {
    next(e);
  }
});

export default router;