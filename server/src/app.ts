import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import "dotenv/config";
import { pathToFileURL } from "node:url";
import type { NextFunction, Request, Response } from "express";

import {
  authRoutes,
  profileRoutes,
  riasecRoutes,
  bfiRoutes,
  recommendRoutes,
  jambRoutes,
  adminRoutes,
} from "./modules/index.js";

const app = express();
// Tell Express to trust reverse proxy headers (Cloudflare, Railway, etc.)
app.set("trust proxy", 1);

const PORT = process.env["PORT"] ?? 5000;
const IS_PROD = process.env["NODE_ENV"] === "production";

// ── Serverless guard ─────────────────────────────────────────────────────
// Netlify Functions (and Vercel/AWS Lambda) import this module as a library
// and cannot run a long-lived process: app.listen() would keep the Lambda
// event loop alive and hang the invocation until timeout. Only bind a port
// when this file is the actual process entrypoint (pnpm dev / pnpm start)
// AND we are not inside a serverless sandbox.
const IS_SERVERLESS = Boolean(
  process.env["AWS_LAMBDA_FUNCTION_NAME"] ||
    (process.env["AWS_EXECUTION_ENV"] ?? "").startsWith("AWS_Lambda") ||
    process.env["NETLIFY"]
);
const IS_MAIN =
  !!process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

// Security headers. CSP disabled because this is a JSON API, not an HTML server
app.use(helmet({ contentSecurityPolicy: false }));

// CORS
// CLIENT_URL on Railway accepts a comma-separated list of allowed origins.
// Example: https://dss-client.arcevocirqle.com.ng,http://localhost:5173
// Any *.vercel.app and *.arcevocirqle.com.ng subdomain is also allowed
// automatically so preview deployments and future subdomains never break.
const allowedOrigins = (process.env["CLIENT_URL"] ?? "http://localhost:5173")
  .split(",")
  .map((o) => o.trim().replace(/\/$/, ""))
  .filter(Boolean);

function isOriginAllowed(origin: string): boolean {
  const o = origin.replace(/\/$/, "");
  if (allowedOrigins.includes(o)) return true;
  if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(o)) return true;
  if (/^https:\/\/[a-z0-9-]+\.netlify\.app$/i.test(o)) return true;
  if (/^https:\/\/[a-z0-9-]+\.arcevocirqle\.com\.ng$/i.test(o)) return true;
  return false;
}

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        console.warn("[CORS] blocked:", origin);
        callback(new Error("CORS: origin not allowed"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 204,
  })
);

// Ensure OPTIONS preflight requests are answered immediately before any
// other middleware (rate limiters, auth guards) can intercept them
app.options("*", cors());

app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));

// Rate limiting (production only)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many authentication attempts. Please try again in 15 minutes." },
  skip: () => !IS_PROD,
});

const apiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please slow down." },
  skip: () => !IS_PROD,
});

app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api", apiLimiter);

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "DSS API",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    environment: process.env["NODE_ENV"] ?? "development",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/riasec", riasecRoutes);
app.use("/api/bfi", bfiRoutes);
app.use("/api/recommend", recommendRoutes);
app.use("/api/jamb", jambRoutes);
app.use("/api/admin", adminRoutes);

app.use((req: Request, res: Response) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[DSS API Error]", err);

  if (err instanceof Error && err.message === "CORS: origin not allowed") {
    res.status(403).json({ error: "Cross-origin request blocked." });
    return;
  }

  if (err && typeof err === "object" && "name" in err) {
    if ((err as { name: string }).name === "ZodError") {
      const zodErr = (err as unknown) as { issues: unknown };
      res.status(400).json({ error: "Validation failed", details: zodErr.issues });
      return;
    }
  }

  if (err && typeof err === "object" && "code" in err) {
    if ((err as { code: string }).code === "P2002") {
      res.status(409).json({ error: "A record with this value already exists." });
      return;
    }
  }

  res.status(500).json({ error: IS_PROD ? "Internal server error" : String(err) });
});

if (IS_MAIN && !IS_SERVERLESS) {
  app.listen(PORT, () => {
    console.log(`DSS API running. Port ${PORT}. ${process.env["NODE_ENV"] ?? "development"}`);
    console.log(
      `CORS origins: ${allowedOrigins.join(", ")} + *.vercel.app + *.netlify.app + *.arcevocirqle.com.ng`
    );
  });
}

export default app;