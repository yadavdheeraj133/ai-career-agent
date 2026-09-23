import { Request, Response, NextFunction} from 'express';
import { ZodError } from 'zod';

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




