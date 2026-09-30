import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../../prisma";
import { requireAuth, signToken, AuthRequest } from "../middleware/auth";

const router = Router();
const loginSchema = z.object({ username: z.string().min(1), password: z.string().min(1) });

router.post("/login", async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { username: input.username } });
    if (!user || user.status !== "ACTIVE" || !(await bcrypt.compare(input.password, user.passwordHash))) {
      return res.status(401).json({ success: false, message: "Invalid username or password" });
    }
    const token = signToken({ id: user.id, role: user.role, username: user.username });
    res.json({ success: true, token, user: { id: user.id, fullName: user.fullName, username: user.username, role: user.role, department: user.department } });
  } catch (e) { next(e); }
});

router.get("/me", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { id: true, fullName: true, username: true, role: true, department: true, status: true, phone: true, email: true, profileImage: true } });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, user });
  } catch (e) { next(e); }
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

router.post("/change-password", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });

    const matches = await bcrypt.compare(currentPassword, user.passwordHash);

    if (!matches) {
      return res.status(401).json({ success: false, message: "Current password is incorrect." });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    res.json({ success: true, message: "Password updated." });
  } catch (e) {
    next(e);
  }
});

export default router;