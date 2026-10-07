import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import productsRouter from "./routes/products.js";
import ordersRouter from "./routes/orders.js";
import adminRouter from "./routes/admin.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middlewares
app.use(
  cors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : true,
    credentials: true,
  }),
);
app.use(express.json());

// Health Check
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", service: "ligeria-backend", timestamp: new Date().toISOString() });
});

// API Routes
app.use("/api/products", productsRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/admin", adminRouter);

// 404 Handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Route not found" });
});

// Global Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[Unhandled Error]:", err);
  res.status(500).json({ error: err?.message || "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`[Ligeria Backend] Server is running on port ${PORT}`);
});

export default app;
