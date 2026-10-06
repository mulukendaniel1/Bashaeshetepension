import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { ZodError } from "zod";
import { prisma } from "../prisma";
import { Prisma } from "./generated/prisma/client";

import authRoutes from "./routes/auth";
import roomRoutes from "./routes/rooms";
import guestRoutes from "./routes/guests";
import dashboardRoutes from "./routes/dashboard";
import bookingsRoutes from "./routes/bookings";
import paymentsRoutes from "./routes/payments";
import expensesRoutes from "./routes/Expenses";
import inventoryRoutes from "./routes/Inventory";
import housekeepingRoutes from "./routes/housekeeping";
import maintenanceRoutes from "./routes/maintenance";
import staffRoutes from "./routes/staff";
import reportsRoutes from "./routes/Reports";
import settingsRoutes from "./routes/settings";

import shiftsRoutes from "./routes/shifts";
import zreportRoutes from "./routes/zreport";
import bankAccountsRoutes from "./routes/bankAccounts";

const app = express();
const port = Number(process.env.PORT || 5000);

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || true, credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300 }));

app.get("/api/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ success: true, message: "Basha Eshete API is running", database: "connected" });
  } catch {
    res.status(503).json({ success: false, message: "API is running but database is unavailable" });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/guests", guestRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/bookings", bookingsRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/expenses", expensesRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/housekeeping", housekeepingRoutes);
app.use("/api/maintenance", maintenanceRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/shifts", shiftsRoutes);
app.use("/api/zreport", zreportRoutes);
app.use("/api/bank-accounts", bankAccountsRoutes);

// 404 for any unmatched /api route, before the error handler.
app.use("/api", (_req, res) => {
  res.status(404).json({ success: false, message: "Not found." });
});

app.use(
  (err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    // Always log the full error server-side for debugging. This never
    // reaches the client.
    console.error(err);

    // Errors we threw ourselves on purpose, with an explicit status and a
    // message that is already safe to show (e.g. "Invalid username or password").
    if (err?.status && typeof err?.message === "string" && err?.safe) {
      return res.status(err.status).json({ success: false, message: err.message });
    }

    // Zod validation errors describe what the client sent wrong, safe to show.
    if (err instanceof ZodError) {
      const firstIssue = err.issues[0];
      return res.status(400).json({
        success: false,
        message: firstIssue ? `${firstIssue.path.join(".")}: ${firstIssue.message}` : "Invalid request.",
      });
    }

    // Known Prisma errors get a safe, generic translation. Never forward
    // err.message here, it can contain file paths and schema internals.
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") {
        return res.status(409).json({ success: false, message: "That value is already in use." });
      }

      if (err.code === "P2025") {
        return res.status(404).json({ success: false, message: "Record not found." });
      }

      return res.status(500).json({ success: false, message: "A database error occurred." });
    }

    if (
      err instanceof Prisma.PrismaClientInitializationError ||
      err?.code === "ECONNREFUSED" ||
      (typeof err?.message === "string" && err.message.includes("ECONNREFUSED"))
    ) {
      return res.status(503).json({
        success: false,
        message: "Could not reach the database. Please try again shortly.",
      });
    }

    // Anything else: never leak the raw message to the client.
    res.status(500).json({ success: false, message: "Internal server error." });
  }
);

app.listen(port, () => console.log(`Basha Eshete API listening on http://localhost:${port}`));