import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRoles } from "../middleware/auth";
import { UserRole } from "../generated/prisma/enums";
import { saveImageFromDataUrl } from "../utils/uploads";

const router = Router();
router.use(requireAuth);

const uploadSchema = z.object({ dataUrl: z.string().min(50) });

router.post("/", requireRoles(UserRole.OWNER, UserRole.MANAGER), async (req, res, next) => {
  try {
    const { dataUrl } = uploadSchema.parse(req.body);
    const url = await saveImageFromDataUrl(dataUrl);

    res.status(201).json({ success: true, url });
  } catch (e) {
    next(e);
  }
});

export default router;