import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { prisma } from "../prisma";
import authRoutes from "./routes/auth";
import roomRoutes from "./routes/rooms";
import guestRoutes from "./routes/guests";
import dashboardRoutes from "./routes/dashboard";
 import bookingsRouter from "./routes/bookings";
 import paymentsRouter from "./routes/payments";
 import expensesRouter from "./routes/Expenses";
 import inventoryRouter from "./routes/Inventory";
 import housekeepingRouter from "./routes/housekeeping";
import maintenanceRouter from "./routes/maintenance";
import staffRouter from "./routes/staff";
import ReportsRouter from "./routes/Reports";

const app = express();
const port = Number(process.env.PORT || 5000);

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || true, credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300 }));
app.use("/api/bookings", bookingsRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/expenses", expensesRouter);
app.use("/api/inventory", inventoryRouter);
app.use("/api/housekeeping", housekeepingRouter);
app.use("/api/maintenance", maintenanceRouter);
app.use("/api/staff", staffRouter);
app.use("/api/reports", ReportsRouter);
import settingsRouter from "./routes/settings";
import zreportRouter from "./routes/zreport";

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
app.use("/api/settings", settingsRouter);
app.use("/api/zreport", zreportRouter);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(err?.status || 500).json({ success: false, message: err?.message || "Internal server error" });
});

app.listen(port, () => console.log(`Basha Eshete API listening on http://localhost:${port}`));
