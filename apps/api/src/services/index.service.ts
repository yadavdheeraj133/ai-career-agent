import bcrypt from "bcrypt";
import crypto from "node:crypto";
import { authRepository } from "../repositories/auth.repository.js";
import { RegisterInput } from "../validators/auth/register.validator.js";
import { LoginInput } from "../validators/auth/login.validator.js";
import {
  ForgotPasswordInput,
  ResetPasswordInput,
} from "../validators/auth/password-reset.validator.js";
import { ChangePasswordInput } from "../validators/auth/change-password.validator.js";
import { generateToken } from "../utils/jwt.js";

/** Reset tokens are valid for 1 hour and single-use. */
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

function hashResetToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export class AuthService {
  async register(data: RegisterInput) {
    const existingUser = await authRepository.findUserByEmail(data.email);

    if (existingUser) {
      throw new Error("Email already exists");
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await authRepository.createUser({
      name: data.name,
      email: data.email,
      password: hashedPassword,
    });
    return user;
  }

  async login(data: LoginInput) {
  const user = await authRepository.findUserByEmail(data.email);

  if (!user) {
    throw new Error("Invalid email or password");
  }

  if (!user.password) {
    throw new Error("Invalid email or password");
  }

  const isPasswordCorrect = await bcrypt.compare(
    data.password,
    user.password
  );

  if (!isPasswordCorrect) {
    throw new Error("Invalid email or password");
  }

  const token = generateToken(user.id);

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
    token,
  };
}

  /**
   * Issues a single-use password-reset token.
   *
   * Always resolves successfully (even for unknown emails) so callers cannot
   * enumerate registered accounts. The raw token is returned so tests and the
   * non-production forgot-password UI can complete the flow without an SMTP
   * provider; production deployments should deliver it by email instead and
   * ignore the returned value.
   */
  async requestPasswordReset(data: ForgotPasswordInput) {
    const user = await authRepository.findUserByEmail(data.email);

    if (!user) {
      return { sent: true as const, resetToken: null as string | null };
    }

    await authRepository.deletePasswordResetTokensForUser(user.id);

    const resetToken = crypto.randomBytes(32).toString("hex");

    await authRepository.createPasswordResetToken({
      userId: user.id,
      tokenHash: hashResetToken(resetToken),
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    });

    return { sent: true as const, resetToken };
  }

  async resetPassword(data: ResetPasswordInput) {
    const record = await authRepository.findPasswordResetTokenByHash(
      hashResetToken(data.token)
    );

    if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
      throw new Error("Invalid or expired reset token");
    }

    const hashedPassword = await bcrypt.hash(data.newPassword, 10);

    await authRepository.updatePassword(record.userId, hashedPassword);
    await authRepository.markPasswordResetTokenUsed(record.id);

    return { reset: true as const };
  }

  /**
   * Authenticated password change. Verifies the current password, validates
   * the replacement via Zod at the controller boundary, and stores only the
   * bcrypt hash — passwords are never logged.
   */
  async changePassword(userId: string, data: ChangePasswordInput) {
    const credentials = await authRepository.findUserCredentialsById(userId);

    if (!credentials) {
      throw new Error("User not found");
    }

    if (!credentials.password) {
      throw new Error("No password is set for this account");
    }

    const isCurrentCorrect = await bcrypt.compare(
      data.currentPassword,
      credentials.password
    );

    if (!isCurrentCorrect) {
      throw new Error("Current password is incorrect");
    }

    const isSamePassword = await bcrypt.compare(
      data.newPassword,
      credentials.password
    );

    if (isSamePassword) {
      throw new Error("New password must be different from the current password");
    }

    const hashedPassword = await bcrypt.hash(data.newPassword, 10);

    await authRepository.updatePassword(userId, hashedPassword);
    await authRepository.deletePasswordResetTokensForUser(userId);

    return { changed: true as const };
  }
}

export const authService = new AuthService();
