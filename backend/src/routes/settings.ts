import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../prisma";
import { requireAuth, requireRoles } from "../middleware/auth";
import { UserRole } from "../generated/prisma/enums";

const router = Router();
router.use(requireAuth);

const DEFAULTS: Record<string, string> = {
  businessName: "Basha Eshete Pension",
  tin: "",
  phone: "",
  address: "",
  checkInTime: "14:00",
  checkOutTime: "12:00",
  currency: "ETB",
  taxRate: "0",
};

router.get("/", async (req, res, next) => {
  try {
    const rows = await prisma.setting.findMany();
    const stored: Record<string, string> = {};

    rows.forEach((row) => {
      stored[row.key] = row.value;
    });

    res.json({ success: true, settings: { ...DEFAULTS, ...stored } });
  } catch (e) {
    next(e);
  }
});

const settingsSchema = z.record(z.string(), z.string());

router.put(
  "/",
  requireRoles(UserRole.OWNER, UserRole.MANAGER),
  async (req, res, next) => {
    try {
      const input = settingsSchema.parse(req.body);

      await prisma.$transaction(
        Object.entries(input).map(([key, value]) =>
          prisma.setting.upsert({
            where: { key },
            update: { value },
            create: { key, value },
          })
        )
      );

      const rows = await prisma.setting.findMany();
      const stored: Record<string, string> = {};

      rows.forEach((row) => {
        stored[row.key] = row.value;
      });

      res.json({ success: true, settings: { ...DEFAULTS, ...stored } });
    } catch (e) {
      next(e);
    }
  }
);

export default router;