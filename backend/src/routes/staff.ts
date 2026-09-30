import { Router } from "express";
import bcrypt from "bcryptjs";
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

const publicFields = {
  id: true,
  fullName: true,
  username: true,
  role: true,
  department: true,
  status: true,
  phone: true,
  email: true,
  salary: true,
  startDate: true,
  createdAt: true,
};

const createSchema = z.object({
  fullName: z.string().min(2),
  username: z.string().min(3),
  password: z.string().min(8),
  role: z.enum(["OWNER", "MANAGER", "RECEPTIONIST", "ACCOUNTANT", "STAFF"]).default("STAFF"),
  department: z
    .enum(["FRONT_DESK", "HOUSEKEEPING", "KITCHEN", "MAINTENANCE", "MANAGEMENT"])
    .optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  salary: z.coerce.number().nonnegative().optional(),
  startDate: z.coerce.date().optional(),
});

const updateSchema = createSchema
  .omit({ password: true })
  .partial()
  .extend({ status: z.enum(["ACTIVE", "INACTIVE"]).optional() });

router.get("/", async (req, res, next) => {
  try {
    const staff = await prisma.user.findMany({
      select: publicFields,
      orderBy: { fullName: "asc" },
    });

    res.json({ success: true, staff });
  } catch (e) {
    next(e);
  }
});

router.post("/", requireRoles(UserRole.OWNER, UserRole.MANAGER), async (req: AuthRequest, res, next) => {
  try {
    const { password, ...rest } = createSchema.parse(req.body);

    const creatorRole = req.user?.role;
    const targetRole = rest.role;

    const managerRestrictedRoles: UserRole[] = [UserRole.OWNER, UserRole.MANAGER];

    if (creatorRole === UserRole.MANAGER && managerRestrictedRoles.includes(targetRole)) {
      return res.status(403).json({
        success: false,
        message: "Managers can only create Receptionist, Accountant, or Staff accounts.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const member = await prisma.user.create({
      data: { ...rest, passwordHash },
      select: publicFields,
    });

    res.status(201).json({ success: true, member });
  } catch (e) {
    next(e);
  }
});

router.patch("/:id", requireRoles(UserRole.OWNER, UserRole.MANAGER), async (req: AuthRequest, res, next) => {
  try {
    const input = updateSchema.parse(req.body);
    const id = paramId(req);

    const creatorRole = req.user?.role;
    const managerRestrictedRoles: UserRole[] = [UserRole.OWNER, UserRole.MANAGER];

    if (creatorRole === UserRole.MANAGER) {
      const target = await prisma.user.findUniqueOrThrow({ where: { id }, select: { role: true } });

      if (managerRestrictedRoles.includes(target.role)) {
        return res.status(403).json({
          success: false,
          message: "Managers cannot edit Owner or Manager accounts.",
        });
      }

      if (input.role !== undefined && managerRestrictedRoles.includes(input.role)) {
        return res.status(403).json({
          success: false,
          message: "Managers cannot assign the Owner or Manager role.",
        });
      }
    }

    const member = await prisma.user.update({
      where: { id },
      data: input,
      select: publicFields,
    });

    res.json({ success: true, member });
  } catch (e) {
    next(e);
  }
});

export default router;