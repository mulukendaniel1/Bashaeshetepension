import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../prisma";
import { requireAuth, requireRoles, AuthRequest } from "../middleware/auth";
import { UserRole } from "../generated/prisma/enums";

const router = Router();
router.use(requireAuth);

function paramId(req: { params: Record<string, string | string[] | undefined> }): string {
  const value = req.params.id;
  return Array.isArray(value) ? value[0] : (value as string);
}

const canCreateTasks = requireRoles(UserRole.OWNER, UserRole.MANAGER);

const taskSchema = z.object({
  roomId: z.string().min(1),
  type: z.enum(["CLEANING", "TURNOVER", "DEEP_CLEAN", "INSPECTION"]),
  priority: z.enum(["NORMAL", "URGENT"]).default("NORMAL"),
  assignedToId: z.string().optional(),
  notes: z.string().optional(),
});

const includeRelations = {
  room: { include: { roomType: true } },
  assignedTo: { select: { id: true, fullName: true } },
};

router.get("/", async (req, res, next) => {
  try {
    const status = req.query.status ? String(req.query.status) : undefined;

    const tasks = await prisma.housekeepingTask.findMany({
      where: status ? { status: status as any } : undefined,
      include: includeRelations,
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, tasks });
  } catch (e) {
    next(e);
  }
});

router.post("/", canCreateTasks, async (req, res, next) => {
  try {
    const input = taskSchema.parse(req.body);

    const task = await prisma.housekeepingTask.create({
      data: { ...input, status: "PENDING" },
      include: includeRelations,
    });

    res.status(201).json({ success: true, task });
  } catch (e) {
    next(e);
  }
});

const statusSchema = z.object({
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED"]),
});

// Owner and Manager can update any task. Staff can only update a task
// assigned to them, and cannot reassign it or touch anything else.
router.patch("/:id/status", async (req: AuthRequest, res, next) => {
  try {
    const { status } = statusSchema.parse(req.body);
    const id = paramId(req);

    const existing = await prisma.housekeepingTask.findUniqueOrThrow({ where: { id } });

    const isOwnerOrManager = req.user?.role === UserRole.OWNER || req.user?.role === UserRole.MANAGER;
    const isOwnTask = existing.assignedToId === req.user?.id;

    if (!isOwnerOrManager && !isOwnTask) {
      return res.status(403).json({
        success: false,
        message: "You can only update tasks assigned to you.",
      });
    }

    const task = await prisma.housekeepingTask.update({
      where: { id },
      data: { status },
      include: includeRelations,
    });

    if (status === "COMPLETED") {
      await prisma.room.update({
        where: { id: task.roomId },
        data: { status: "AVAILABLE" },
      });
    }

    res.json({ success: true, task });
  } catch (e) {
    next(e);
  }
});

router.delete("/:id", canCreateTasks, async (req, res, next) => {
  try {
    await prisma.housekeepingTask.delete({ where: { id: paramId(req) } });
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

export default router;