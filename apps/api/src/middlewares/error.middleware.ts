import { Request, Response, NextFunction} from 'express';
import { ZodError } from 'zod';
import { isAIProviderError } from '../ai/providers/ai-provider.error.js';

export const errorHandler = (
  
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction

):void => {
    if (err instanceof ZodError) {
        res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: err.issues,
        });
        return;
    }

    // An AI boundary failure carries its own classification. Reporting it as a
    // generic 500 hid the difference between a misconfigured provider, a bad
    // credential, a rate limit and a timeout, so each is surfaced with the
    // status the client should actually see.
    if (isAIProviderError(err)) {
        // Server-side detail only: the response body never echoes base URLs,
        // model names or credentials.
        console.error(
            `[AI] ${err.code}${err.upstreamStatus ? ` (upstream ${err.upstreamStatus})` : ''}: ${err.message}`
        );

        res.status(err.httpStatus).json({
            success: false,
            message: err.clientMessage,
            code: err.code,
        });
        return;
    }

    const message = err.message || 'Internal Server Error';

    if (/not found/i.test(message)) {
        res.status(404).json({
            success: false,
            message,
        });
        return;
    }

    if (/already exist/i.test(message)) {
        res.status(409).json({
            success: false,
            message,
        });
        return;
    }

    // Log the actual error for debugging
    console.error(err);

    // Return generic message to avoid leaking internal details
    res.status(500).json({
        success: false,
        message: 'Internal Server Error',
    });
}




