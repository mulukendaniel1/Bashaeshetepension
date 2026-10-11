import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { prisma } from "../../prisma";
import { serializeDecimals } from "../utils/decimal";

// Public routes. No login. Visitors of the website use them.
const router = Router();

const BLOCKING = ["PENDING", "CONFIRMED", "CHECKED_IN"] as const;
const MAX_NIGHTS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

const INFO_DEFAULTS: Record<string, string> = {
  businessName: "Basha Eshete Pension",
  phone: "",
  address: "",
  checkInTime: "14:00",
  checkOutTime: "12:00",
  currency: "ETB",
  // Website content. Edited in the admin Website page. Empty means the site uses its built-in text.
  siteTagline: "",
  siteEmail: "",
  siteHours: "",
  siteMapQuery: "",
  siteHeroImage: "",
  siteAboutImage: "",
  siteAboutText: "",
};

function nightsBetween(checkIn: Date, checkOut: Date) {
  return Math.max(Math.ceil((checkOut.getTime() - checkIn.getTime()) / DAY_MS), 1);
}

// Dates come as yyyy-mm-dd. Allow one day of slack for time zones.
function validateStay(checkIn: Date, checkOut: Date): string | null {
  if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime())) {
    return "Choose valid dates.";
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (checkIn.getTime() < today.getTime() - DAY_MS) {
    return "The check-in date is in the past.";
  }

  if (checkOut <= checkIn) {
    return "Check-out must be after check-in.";
  }

  if (nightsBetween(checkIn, checkOut) > MAX_NIGHTS) {
    return `Online requests are limited to ${MAX_NIGHTS} nights. Please call us for longer stays.`;
  }

  return null;
}

// Rooms free for the dates, minus open website requests for the same type.
async function availableCount(roomTypeId: string, checkIn: Date, checkOut: Date) {
  const [rooms, pending] = await Promise.all([
    prisma.room.count({
      where: {
        roomTypeId,
        status: { not: "MAINTENANCE" },
        bookings: {
          none: {
            status: { in: [...BLOCKING] },
            checkInDate: { lt: checkOut },
            checkOutDate: { gt: checkIn },
          },
        },
      },
    }),
    prisma.bookingRequest.count({
      where: {
        roomTypeId,
        status: "NEW",
        checkInDate: { lt: checkOut },
        checkOutDate: { gt: checkIn },
      },
    }),
  ]);

  return Math.max(rooms - pending, 0);
}

router.get("/info", async (_req, res, next) => {
  try {
    const rows = await prisma.setting.findMany({
      where: { key: { in: Object.keys(INFO_DEFAULTS) } },
    });

    const info = { ...INFO_DEFAULTS };
    rows.forEach((row) => {
      if (row.value.trim()) info[row.key] = row.value;
    });

    res.json({ success: true, info });
  } catch (e) {
    next(e);
  }
});

router.get("/room-types", async (_req, res, next) => {
  try {
    const types = await prisma.roomType.findMany({
      where: { isPublic: true },
      orderBy: { basePrice: "asc" },
      include: {
        rooms: {
          where: { status: { not: "MAINTENANCE" } },
          select: { imageUrl: true },
        },
      },
    });

    const roomTypes = types.map((type) => ({
      id: type.id,
      name: type.name,
      description: type.description,
      basePrice: type.basePrice,
      maxGuests: type.maxGuests,
      beds: type.beds,
      imageUrl: type.imageUrl || type.rooms.find((room) => room.imageUrl)?.imageUrl || null,
      roomCount: type.rooms.length,
    }));

    res.json({ success: true, roomTypes: serializeDecimals(roomTypes) });
  } catch (e) {
    next(e);
  }
});

const availabilitySchema = z.object({
  checkIn: z.coerce.date(),
  checkOut: z.coerce.date(),
  guests: z.coerce.number().int().min(1).max(10).default(1),
});

router.get("/availability", async (req, res, next) => {
  try {
    const { checkIn, checkOut, guests } = availabilitySchema.parse(req.query);

    const problem = validateStay(checkIn, checkOut);
    if (problem) {
      return res.status(400).json({ success: false, message: problem });
    }

    const types = await prisma.roomType.findMany({
      where: { isPublic: true, maxGuests: { gte: guests } },
      orderBy: { basePrice: "asc" },
    });

    const roomTypes = await Promise.all(
      types.map(async (type) => ({
        id: type.id,
        name: type.name,
        description: type.description,
        basePrice: type.basePrice,
        maxGuests: type.maxGuests,
        beds: type.beds,
        available: await availableCount(type.id, checkIn, checkOut),
      }))
    );

    res.json({
      success: true,
      nights: nightsBetween(checkIn, checkOut),
      roomTypes: serializeDecimals(roomTypes),
    });
  } catch (e) {
    next(e);
  }
});

const submitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests. Please try again later." },
});

const requestSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  phone: z
    .string()
    .trim()
    .min(7)
    .max(20)
    .regex(/^[+\d][\d\s-]{6,}$/, "Enter a valid phone number."),
  email: z.string().trim().email().max(120).optional().or(z.literal("")),
  roomTypeId: z.string().min(1),
  checkInDate: z.coerce.date(),
  checkOutDate: z.coerce.date(),
  numberOfGuests: z.coerce.number().int().min(1).max(10),
  message: z.string().trim().max(500).optional(),
  // Hidden field. People leave it empty. Bots fill it.
  website: z.string().optional(),
});

router.post("/booking-requests", submitLimiter, async (req, res, next) => {
  try {
    const input = requestSchema.parse(req.body);

    if (input.website) {
      // A bot. Reply as if it worked and store nothing.
      return res.status(201).json({ success: true, reference: "WR-000000" });
    }

    const problem = validateStay(input.checkInDate, input.checkOutDate);
    if (problem) {
      return res.status(400).json({ success: false, message: problem });
    }

    const roomType = await prisma.roomType.findUnique({ where: { id: input.roomTypeId } });

    if (!roomType || !roomType.isPublic) {
      return res.status(404).json({ success: false, message: "That room type does not exist." });
    }

    if (input.numberOfGuests > roomType.maxGuests) {
      return res.status(400).json({
        success: false,
        message: `This room holds up to ${roomType.maxGuests} guests.`,
      });
    }

    const recent = await prisma.bookingRequest.count({
      where: {
        phone: input.phone,
        createdAt: { gte: new Date(Date.now() - DAY_MS) },
      },
    });

    if (recent >= 3) {
      return res.status(429).json({
        success: false,
        message: "You already sent several requests today. Please call us.",
      });
    }

    const free = await availableCount(roomType.id, input.checkInDate, input.checkOutDate);

    if (free < 1) {
      return res.status(409).json({
        success: false,
        message: "Sorry, no room of this type is free for those dates.",
      });
    }

    const request = await prisma.bookingRequest.create({
      data: {
        fullName: input.fullName,
        phone: input.phone,
        email: input.email || null,
        roomTypeId: roomType.id,
        checkInDate: input.checkInDate,
        checkOutDate: input.checkOutDate,
        numberOfGuests: input.numberOfGuests,
        message: input.message || null,
      },
    });

    res.status(201).json({
      success: true,
      reference: `WR-${request.id.slice(-6).toUpperCase()}`,
    });
  } catch (e) {
    next(e);
  }
});

export default router;