import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import { config } from "./config.js";
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

  app.get("/health", (_req, res) => res.json({ ok: true, service: "segempat-api" }));

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
