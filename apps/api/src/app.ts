import express, { Router, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import router from "./routes/index.route.js";
import { env } from "./config/env.js";

const app: express.Application = express();

export default app;

//middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim())
      : process.env.NODE_ENV === "production"
        ? false
        : true,
    credentials: true,
  })
);
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 1000,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    // The automated suite drives hundreds of requests per run; never 429 it.
    skip: () => process.env.NODE_ENV === "test",
  })
);
app.use(express.json({ limit: "1mb" }));

/**
 * Body-parser failures are raised before the router is reached, so the router's
 * error handler never sees them and Express falls back to its default handler,
 * which answers with an HTML page that embeds a stack trace. Both are reported
 * here in the same JSON envelope the rest of the API uses.
 */
app.use(
  (
    err: Error & { type?: string },
    _req: Request,
    res: Response,
    next: NextFunction
  ) => {
    if (err?.type === "entity.parse.failed") {
      res.status(400).json({
        success: false,
        message: "Malformed JSON in request body.",
        data: null,
      });
      return;
    }

    if (err?.type === "entity.too.large") {
      res.status(413).json({
        success: false,
        message: "Request body exceeds the 1 MB limit.",
        data: null,
      });
      return;
    }

    next(err);
  }
);

/**
 * `express.json()` only parses a body when the request declares JSON, and
 * Express 5 leaves `req.body` undefined otherwise. Handlers that destructure
 * `req.body` would then throw a TypeError and surface it as a 500, so a request
 * carrying no parseable body is normalised once here: that is a client-side
 * validation failure, not a server fault.
 */
app.use((req: Request, _res: Response, next: NextFunction) => {
  if (req.body === undefined || req.body === null) {
    req.body = {};
  }
  next();
});

app.use(cookieParser(env.COOKIE_SECRET));

// Register Routes
app.use("/", router);

// JSON 404 for unmatched routes (must be after all routes)
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
    data: null,
  });
});
