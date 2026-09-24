import { RegisterInput } from "../validators/auth/register.validator.js";
import { prisma } from "../lib/prisma.js";

export class AuthRepository {
  async findUserByEmail(email: string) {
    return prisma.user.findUnique({
      where: {
        email,
      },
    });
  }

  async findUserByProviderId(provider: string, providerId: string) {
    return prisma.user.findUnique({
      where: {
        provider_providerId: { provider, providerId },
      },
    });
  }

  async createUser(data: RegisterInput & { password: string }) {
    return prisma.user.create({
      data,
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async createOAuthUser(data: {
    name: string;
    email: string;
    provider: string;
    providerId: string;
    avatarUrl?: string;
    password?: string;
  }) {
    return prisma.user.create({
      data,
      select: {
        id: true,
        name: true,
        email: true,
        provider: true,
        providerId: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async linkProviderToUser(
    userId: string,
    provider: string,
    providerId: string,
    avatarUrl?: string
  ) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        provider,
        providerId,
        ...(avatarUrl ? { avatarUrl } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        provider: true,
        providerId: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findUserById(id: string) {
  return prisma.user.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      name: true,
      email: true,
      provider: true,
      providerId: true,
      avatarUrl: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

  async findUserCredentialsById(id: string) {
    return prisma.user.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        email: true,
        password: true,
      },
    });
  }

  async updatePassword(id: string, hashedPassword: string) {
    return prisma.user.update({
      where: {
        id,
      },
      data: {
        password: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        email: true,
        provider: true,
        providerId: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async deletePasswordResetTokensForUser(userId: string) {
    return prisma.passwordResetToken.deleteMany({
      where: {
        userId,
        usedAt: null,
      },
    });
  }

  async createPasswordResetToken(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }) {
    return prisma.passwordResetToken.create({
      data,
    });
  }

  async findPasswordResetTokenByHash(tokenHash: string) {
    return prisma.passwordResetToken.findUnique({
      where: {
        tokenHash,
      },
    });
  }

  async markPasswordResetTokenUsed(id: string) {
    return prisma.passwordResetToken.update({
      where: {
        id,
      },
      data: {
        usedAt: new Date(),
      },
    });
  }
}

export const authRepository = new AuthRepository();