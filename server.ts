import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import apiRouter from "./server/apiRouter";

const baseDir = typeof __dirname !== "undefined" ? __dirname : process.cwd();

const PORT = 3000;

async function startServer() {
  const app = express();

  // Middleware
  app.use(express.json({ limit: "25mb" }));
  app.use(express.urlencoded({ extended: true, limit: "25mb" }));

  // Open CORS for reliable cross-origin and API access
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  // Root health check for external deployment runners and load balancers
  app.get("/health", (_req, res) => {
    res.json({ status: "healthy", service: "Coimbatore CleanWater", timestamp: new Date().toISOString() });
  });

  // Static uploads with fallback paths
  const candidateUploadDirs = [
    path.join(process.cwd(), "uploads"),
    path.join(baseDir, "uploads"),
    path.join(baseDir, "..", "uploads"),
  ];
  const uploadDir = candidateUploadDirs.find((d) => fs.existsSync(d)) || path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadDir)) {
    try {
      fs.mkdirSync(uploadDir, { recursive: true });
    } catch {}
  }
  app.use("/uploads", express.static(uploadDir));

  // Native API router
  app.use("/api", apiRouter);

  // Frontend middleware: Vite in dev, compiled static files in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== "true" },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const candidateDistPaths = [
      path.join(process.cwd(), "dist"),
      path.join(baseDir),
      path.join(baseDir, "dist"),
      path.join(baseDir, "..", "dist"),
    ];
    const distPath =
      candidateDistPaths.find((d) => fs.existsSync(path.join(d, "index.html"))) ||
      path.join(process.cwd(), "dist");

    console.log(`Serving static production files from: ${distPath}`);
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Coimbatore CleanWater platform listening on http://0.0.0.0:${PORT}`);
  });

  const cleanup = () => {
    server.close(() => process.exit(0));
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
}

startServer().catch((err) => {
  console.error("Failed to start fullstack server:", err);
  process.exit(1);
});
