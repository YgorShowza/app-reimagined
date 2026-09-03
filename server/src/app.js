import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import { config } from "./config.js";
import { healthcheck, queryOne } from "./db.js";
import { attachUser } from "./session.js";
import { authRouter } from "./routes/auth.js";
import { employeesRouter } from "./routes/employees.js";
import { accessRouter } from "./routes/access.js";
import { examsRouter, myExamsRouter } from "./routes/exams.js";
import { examEvidenceRouter } from "./routes/exam-evidence.js";
import { cronogramaRouter } from "./routes/cronograma.js";
import { questionBankRouter } from "./routes/question-bank.js";
import { trainingRouter, adminTrainingRouter, myTrainingRouter } from "./routes/training.js";
import { operationsRouter } from "./routes/operations.js";
import { myPracticalRouter } from "./routes/practical-self.js";
import { HttpError } from "./util.js";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) return callback(null, true);
        if (config.allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new HttpError(403, "Origem não autorizada", "CORS_FORBIDDEN"));
      },
      credentials: true,
      methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Accept"],
    }),
  );
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: false, limit: "2mb" }));
  app.use(cookieParser());
  app.use(attachUser);

  // Liveness: confirma apenas que o processo HTTP está respondendo.
  app.get("/health", (_req, res) => res.json({ ok: true, service: "segempat-api" }));

  // Readiness: só fica pronta quando o MySQL responde e o histórico de migrations existe.
  // É apropriada para health checks do balanceador/orquestrador no ambiente corporativo.
  app.get("/health/ready", async (_req, res) => {
    try {
      await healthcheck();
      const migration = await queryOne(
        `SELECT version, file_name, applied_at
           FROM schema_migrations
          ORDER BY CAST(version AS UNSIGNED) DESC, version DESC
          LIMIT 1`,
      );
      if (!migration) {
        return res.status(503).json({
          ok: false,
          service: "segempat-api",
          database: "connected",
          migrations: "not-applied",
        });
      }
      return res.json({
        ok: true,
        service: "segempat-api",
        database: "connected",
        migration: {
          version: String(migration.version),
          file_name: migration.file_name,
          applied_at: migration.applied_at,
        },
      });
    } catch (error) {
      console.error("[segempat-api] readiness falhou", error?.message || error);
      return res.status(503).json({
        ok: false,
        service: "segempat-api",
        database: "unavailable",
      });
    }
  });

  app.use("/api/auth", authRouter);
  app.use("/api/employees", employeesRouter);
  app.use("/api/access", accessRouter);
  app.use("/api/exams", examsRouter);
  app.use("/api/me", myExamsRouter);
  app.use("/api/me", myPracticalRouter);
  app.use("/api/admin", examEvidenceRouter);
  app.use("/api/cronograma", cronogramaRouter);
  app.use("/api/question-bank", questionBankRouter);
  app.use("/api/training", trainingRouter);
  app.use("/api/admin/training", adminTrainingRouter);
  app.use("/api/me/training", myTrainingRouter);
  app.use("/api/operations", operationsRouter);

  app.use((_req, _res, next) => next(new HttpError(404, "Rota não encontrada", "NOT_FOUND")));
  app.use((error, _req, res, _next) => {
    const status = Number(error?.status) || 500;
    const safeStatus = status >= 400 && status < 600 ? status : 500;
    const isOperational = error instanceof HttpError;
    if (!isOperational) console.error("[segempat-api] erro não tratado", error);
    res.status(safeStatus).json({
      error: isOperational ? error.message : "Erro interno do servidor",
      code: isOperational ? error.code || "ERROR" : "INTERNAL_ERROR",
      details: isOperational ? error.details ?? null : null,
    });
  });

  return app;
}
