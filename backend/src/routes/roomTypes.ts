import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../prisma";
import { serializeDecimals } from "../utils/decimal";
import { requireAuth, requireRoles } from "../middleware/auth";
import { UserRole } from "../generated/prisma/enums";
import { removeUpload } from "../utils/uploads";

// Room types: the price, photo, and text the website shows. Owner and Manager only.
const router = Router();
router.use(requireAuth);

const canEdit = requireRoles(UserRole.OWNER, UserRole.MANAGER);

function paramId(req: { params: Record<string, string | string[] | undefined> }): string {
  const value = req.params.id;
  return Array.isArray(value) ? value[0] : (value as string);
}

const imageField = z
  .string()
  .trim()
  .max(500)
  .refine(
    (value) => value === "" || value.startsWith("/api/uploads/") || /^https?:\/\//.test(value),
    "Invalid photo link."
  )
  .nullable()
  .optional();

const typeSchema = z.object({
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(500).nullable().optional(),
  basePrice: z.coerce.number().positive().max(10_000_000),
  maxGuests: z.coerce.number().int().min(1).max(10),
  beds: z.coerce.number().int().min(1).max(10),
  imageUrl: imageField,
  isPublic: z.boolean().optional(),
  // Clears the own price of every room of this type, so all rooms follow the type price.
  applyPriceToRooms: z.boolean().optional(),
});

router.get("/", async (_req, res, next) => {
  try {
    const [types, customRooms] = await Promise.all([
      prisma.roomType.findMany({
        orderBy: { basePrice: "asc" },
        include: { _count: { select: { rooms: true } } },
      }),
      // Rooms with their own price. They ignore the room type price.
      prisma.room.findMany({
        where: { price: { not: null } },
        select: { roomTypeId: true },
      }),
    ]);

    const customByType: Record<string, number> = {};
    customRooms.forEach((room) => {
      customByType[room.roomTypeId] = (customByType[room.roomTypeId] || 0) + 1;
    });

    const roomTypes = types.map((type) => ({
      id: type.id,
      name: type.name,
      description: type.description,
      basePrice: type.basePrice,
      maxGuests: type.maxGuests,
      beds: type.beds,
      imageUrl: type.imageUrl,
      isPublic: type.isPublic,
      roomCount: type._count.rooms,
      customPriceRooms: customByType[type.id] || 0,
    }));

    res.json({ success: true, roomTypes: serializeDecimals(roomTypes) });
  } catch (e) {
    next(e);
  }
});

router.post("/", canEdit, async (req, res, next) => {
  try {
    const input = typeSchema.parse(req.body);

    const roomType = await prisma.roomType.create({
      data: {
        name: input.name,
        description: input.description || null,
        basePrice: input.basePrice,
        maxGuests: input.maxGuests,
        beds: input.beds,
        imageUrl: input.imageUrl || null,
        isPublic: input.isPublic ?? true,
      },
    });

    res.status(201).json({ success: true, roomType: serializeDecimals(roomType) });
  } catch (e) {
    next(e);
  }
});

router.patch("/:id", canEdit, async (req, res, next) => {
  try {
    const id = paramId(req);
    const input = typeSchema.partial().parse(req.body);

    const existing = await prisma.roomType.findUnique({ where: { id } });

    if (!existing) {
      return res.status(404).json({ success: false, message: "Room type not found." });
    }

    const roomType = await prisma.$transaction(async (tx) => {
      const updated = await tx.roomType.update({
        where: { id },
        data: {
          name: input.name,
          description: input.description === undefined ? undefined : input.description || null,
          basePrice: input.basePrice,
          maxGuests: input.maxGuests,
          beds: input.beds,
          imageUrl: input.imageUrl === undefined ? undefined : input.imageUrl || null,
          isPublic: input.isPublic,
        },
      });

      if (input.applyPriceToRooms) {
        await tx.room.updateMany({ where: { roomTypeId: id }, data: { price: null } });
      }

      return updated;
    });

    // Remove the old photo file once it is replaced or cleared.
    if (input.imageUrl !== undefined && (input.imageUrl || null) !== existing.imageUrl) {
      await removeUpload(existing.imageUrl);
    }

    res.json({ success: true, roomType: serializeDecimals(roomType) });
  } catch (e) {
    next(e);
  }
});

router.delete("/:id", canEdit, async (req, res, next) => {
  try {
    const id = paramId(req);

    const existing = await prisma.roomType.findUnique({ where: { id } });

    if (!existing) {
      return res.status(404).json({ success: false, message: "Room type not found." });
    }

    const [rooms, requests] = await Promise.all([
      prisma.room.count({ where: { roomTypeId: id } }),
      prisma.bookingRequest.count({ where: { roomTypeId: id } }),
    ]);

    if (rooms > 0 || requests > 0) {
      return res.status(409).json({
        success: false,
        message: "This room type has rooms or website requests. Hide it from the website instead.",
      });
    }

    await prisma.roomType.delete({ where: { id } });
    await removeUpload(existing.imageUrl);

    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

export default router;