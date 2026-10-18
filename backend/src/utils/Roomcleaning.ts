import { prisma } from "../../prisma";

// A room that is being cleaned goes back to Available after this many minutes.
export const CLEANING_MINUTES = Number(process.env.CLEANING_MINUTES || 30);

/**
 * Release rooms that finished their cleaning time.
 * The time starts when the room status changed to Cleaning (the room's updatedAt).
 * A room with a coming reservation goes back to Reserved, any other room to Available.
 */
export async function releaseCleaningRooms(): Promise<number> {
  const cutoff = new Date(Date.now() - CLEANING_MINUTES * 60 * 1000);

  const rooms = await prisma.room.findMany({
    where: { status: "CLEANING", updatedAt: { lte: cutoff } },
    select: { id: true },
  });

  for (const room of rooms) {
    const reservations = await prisma.booking.count({
      where: { roomId: room.id, status: { in: ["PENDING", "CONFIRMED"] } },
    });

    // The status check protects a room that changed while this loop ran.
    await prisma.room.updateMany({
      where: { id: room.id, status: "CLEANING" },
      data: { status: reservations > 0 ? "RESERVED" : "AVAILABLE" },
    });
  }

  return rooms.length;
}

/**
 * Runs the release every minute while the server is awake.
 * A sleeping server catches up on the next request, because the room list
 * and the dashboard also call releaseCleaningRooms.
 */
export function startCleaningRelease() {
  const run = () =>
    releaseCleaningRooms().catch((err) => console.error("Cleaning release failed:", err));

  run();

  return setInterval(run, 60 * 1000);
}