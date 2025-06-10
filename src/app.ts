import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import { globalRateLimiter } from "./core/middleware/rate-limiter.middleware.js";
import { AppError, HttpCode } from "./core/error/index.js";
import {
  logger,
  userService,
  groupService,
  settlementService,
  expenseService,
  csvProcessingService,
} from "./core/index.js";
import { createUserRouter } from "./features/users/api/index.js";
import { createGroupRouter } from "./features/groups/api/index.js";
import { createSettlementRouter } from "./features/settlements/api/settlement.controller.js";
import { createExpenseRouter } from "./features/expenses/api/expense.controller.js";
import { createCsvRouter } from "./features/csv/api/csv.controller.js";
import { startCentralConsumer } from "./core/events/central.consumer.js";

const DEFAULT_PATH = "/api/v1";

startCentralConsumer();

dotenv.config();

const app: express.Express = express();

app.use(cors());
app.use(helmet());
app.use(express.json());

app.set("trust proxy", 1);

app.use(globalRateLimiter);
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info({ method: req.method, url: req.url, ip: req.ip }, "Incoming request");
  res.on("finish", () => {
    logger.info(
      { method: req.method, url: req.url, status: res.statusCode, ip: req.ip },
      "Request completed"
    );
  });
  next();
});

const userRouter = createUserRouter(userService);
const groupRouter = createGroupRouter(groupService);
const settlementRouter = createSettlementRouter(settlementService);
const expenseRouter = createExpenseRouter(expenseService);
const csvRouter = createCsvRouter(csvProcessingService);

app.use(`${DEFAULT_PATH}/users`, userRouter);
app.use(`${DEFAULT_PATH}/groups`, groupRouter);
app.use(`${DEFAULT_PATH}/settlements`, settlementRouter);
app.use(`${DEFAULT_PATH}/expenses`, expenseRouter);
app.use(`${DEFAULT_PATH}/csv`, csvRouter);

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "UP", timestamp: new Date().toISOString() });
});

app.use((_req: Request, res: Response) => {
  res.status(HttpCode.NOT_FOUND).json({ message: "Resource not found." });
});

app.use((err: Error, _req: Request, res: Response) => {
  logger.error(err, "An unhandled error occurred");
  if (err instanceof AppError) {
    res.status(err.httpCode).json({
      message: err.message,
      isOperational: err.isOperational,
    });
  } else {
    res.status(HttpCode.INTERNAL_SERVER_ERROR).json({
      message: "An unexpected internal server error occurred.",
    });
  }
});

export { app, logger };
