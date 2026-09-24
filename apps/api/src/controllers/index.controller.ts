import { registerSchema } from './../validators/auth/register.validator.js';
import { Request, Response } from "express";
import { authService } from "../services/index.service.js";
import { loginSchema } from "../validators/auth/login.validator.js";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../validators/auth/password-reset.validator.js";
import { changePasswordSchema } from "../validators/auth/change-password.validator.js";
import { ZodError } from "zod";

export const register = async (
  req: Request,
  res: Response
) => {
  try {
    const data = registerSchema.parse(req.body);
    const user = await authService.register(data);

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: user,
    });

  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.issues,
        data: null,
      });
    }

    if (error instanceof Error && /already exists/i.test(error.message)) {
      return res.status(409).json({
        success: false,
        message: error.message,
        data: null,
      });
    }

    return res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : "Error registering user",
      data: null,
    });
  }
};

export const login = async (
  req: Request,
  res: Response
) => {
  try {
    // Validate request body
    const data = loginSchema.parse(req.body);

    // Authenticate user
    const result = await authService.login(data);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: result,
    });

  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.issues,
        data: null,
      });
    }

    if (error instanceof Error && /invalid email or password/i.test(error.message)) {
      return res.status(401).json({
        success: false,
        message: error.message,
        data: null,
      });
    }

    return res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
      data: null,
    });
  }

};

export const changePassword = async (req: Request, res: Response) => {
  try {
    const data = changePasswordSchema.parse(req.body);
    await authService.changePassword(req.user.id, data);

    return res.status(200).json({
      success: true,
      message: "Password changed successfully",
      data: null,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.issues,
        data: null,
      });
    }

    if (
      error instanceof Error &&
      /current password is incorrect/i.test(error.message)
    ) {
      return res.status(401).json({
        success: false,
        message: error.message,
        data: null,
      });
    }

    return res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
      data: null,
    });
  }
};

export const getCurrentUser = async (
  req: Request,
  res: Response
) => {
 return res.status(200).json({
  success: true,
  data: {
    id: req.user.id,
    name: req.user.name,
    email: req.user.email,
  },
});
};

export const forgotPassword = async (
  req: Request,
  res: Response
) => {
  try {
    const data = forgotPasswordSchema.parse(req.body);
    const result = await authService.requestPasswordReset(data);

    // The raw token is exposed only outside production so the flow works
    // without an email provider. Production clients must read it from email.
    const exposeToken = process.env.NODE_ENV !== "production";

    return res.status(200).json({
      success: true,
      message: "If an account exists for that email, a reset link has been sent",
      data: exposeToken ? { resetToken: result.resetToken } : null,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.issues,
        data: null,
      });
    }

    return res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
      data: null,
    });
  }
};

export const resetPassword = async (
  req: Request,
  res: Response
) => {
  try {
    const data = resetPasswordSchema.parse(req.body);
    await authService.resetPassword(data);

    return res.status(200).json({
      success: true,
      message: "Password has been reset successfully",
      data: null,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.issues,
        data: null,
      });
    }

    if (
      error instanceof Error &&
      /invalid or expired reset token/i.test(error.message)
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
        data: null,
      });
    }

    return res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
      data: null,
    });
  }
};
