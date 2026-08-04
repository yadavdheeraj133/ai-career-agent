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

  async createUser(data: RegisterInput & { password: string }) {
    return prisma.user.create({
      data,
    });
  }

  async findUserById(id: string) {
  return prisma.user.findUnique({
    where: {
      id,
    },
  });
}
}

export const authRepository = new AuthRepository();