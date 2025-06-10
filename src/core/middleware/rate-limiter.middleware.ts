import rateLimit from "express-rate-limit";
import { Request, Response } from "express";
import { logger } from "../logger.js";

const DEFAULT_WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_MAX = 100;
const DEFAULT_MESSAGE = "Too many requests from this IP, please try again later";
const DEFAULT_STANDARD_HEADERS = "draft-7";
const DEFAULT_LEGACY_HEADERS = false;
const DEFAULT_AUTH_WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_AUTH_MAX = 5;
const DEFAULT_AUTH_MESSAGE = "Too many authentication attempts, please try again later";
const DEFAULT_EXPENSIVE_OP_WINDOW_MS = 60 * 1000;
const DEFAULT_EXPENSIVE_OP_MAX = 10;
const DEFAULT_EXPENSIVE_OP_MESSAGE = "Rate limit exceeded for resource-intensive operations";

/**
 * Creates a rate limiter middleware with specific configuration
 * @param windowMs Time window in milliseconds
 * @param max Maximum number of requests in the time window
 * @param message Custom message for rate limit exceeded
 * @returns Rate limiter middleware
 */
export const createRateLimiter = (
  windowMs = DEFAULT_WINDOW_MS,
  max = DEFAULT_MAX,
  message = DEFAULT_MESSAGE
) => {
  return rateLimit({
    windowMs,
    max,
    message,
    standardHeaders: DEFAULT_STANDARD_HEADERS,
    legacyHeaders: DEFAULT_LEGACY_HEADERS,
    handler: (req: Request, res: Response) => {
      logger.warn({
        ip: req.ip,
        path: req.path,
        method: req.method,
        message: "Rate limit exceeded",
      });
      res.status(429).json({
        message,
      });
    },
  });
};

export const globalRateLimiter = createRateLimiter();

export const authRateLimiter = createRateLimiter(
  DEFAULT_AUTH_WINDOW_MS,
  DEFAULT_AUTH_MAX,
  DEFAULT_AUTH_MESSAGE
);

export const expensiveOpRateLimiter = createRateLimiter(
  DEFAULT_EXPENSIVE_OP_WINDOW_MS,
  DEFAULT_EXPENSIVE_OP_MAX,
  DEFAULT_EXPENSIVE_OP_MESSAGE
);
