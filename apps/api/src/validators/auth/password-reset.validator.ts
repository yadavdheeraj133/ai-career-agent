import { z } from "zod";

export const forgotPasswordSchema = z.object({
  email: z
    .email("Invalid email address")
    .transform((email) => email.toLowerCase().trim()),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z
    .string()
    .trim()
    .min(32, "Reset token is required")
    .max(256, "Reset token is invalid"),

  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .max(32, "Password must be less than 32 characters long"),
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
