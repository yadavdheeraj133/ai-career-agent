import { registerSchema } from './../validators/auth/register.validator.js';
import { Request, Response } from "express";
import { authService } from "../services/index.service.js";
import { loginSchema } from "../validators/auth/login.validator.js";

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
    return res.status(400).json({
      success: false,
      message: "Error registering user",
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
