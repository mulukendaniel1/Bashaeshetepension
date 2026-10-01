// Prisma's Decimal fields serialize to strings over JSON by default.
// This walks any plain object/array coming back from Prisma and converts
// every Decimal instance to a plain JS number, so the frontend never has
// to guess whether a money field is a string or a number.
import { Prisma } from "../generated/prisma/client";

export function serializeDecimals<T>(value: T): T {
  if (value === null || value === undefined) {
    return value;
  }

  if (value instanceof Prisma.Decimal) {
    return Number(value) as unknown as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => serializeDecimals(item)) as unknown as T;
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "object") {
    const result: Record<string, unknown> = {};

    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      result[key] = serializeDecimals(val);
    }

    return result as T;
  }

  return value;
}