import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../prisma";

async function main() {
  const passwordHash = await bcrypt.hash(
    process.env.SEED_ADMIN_PASSWORD || "ChangeMe123!",
    12
  );

  const user = await prisma.user.upsert({
    where: { username: process.env.SEED_ADMIN_USERNAME || "admin" },
    update: {
      passwordHash,
      role: "OWNER",
      status: "ACTIVE",
      fullName: "System Owner",
    },
    create: {
      username: process.env.SEED_ADMIN_USERNAME || "admin",
      passwordHash,
      role: "OWNER",
      status: "ACTIVE",
      fullName: "System Owner",
    },
  });

  console.log(`Owner ready: ${user.username}`);

  const roomTypes = [
    { name: "Single", basePrice: 800, maxGuests: 1, beds: 1 },
    { name: "Double", basePrice: 1200, maxGuests: 2, beds: 1 },
    { name: "Twin", basePrice: 1400, maxGuests: 2, beds: 2 },
    { name: "Family", basePrice: 2000, maxGuests: 5, beds: 3 },
  ];

  for (const roomType of roomTypes) {
    await prisma.roomType.upsert({
      where: { name: roomType.name },
      update: roomType,
      create: roomType,
    });
  }

  console.log(`Room types ready: ${roomTypes.map((r) => r.name).join(", ")}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());