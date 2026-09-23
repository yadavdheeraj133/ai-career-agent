import { prisma } from "../lib/prisma.js";

export class UserRepository {
  async getProfile(userId: string) {
    return prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async updateProfile(userId: string, data: {
  name?: string;
}) {
  return prisma.user.update({
    where: {
      id: userId,
    },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

async deleteProfile(userId: string) {
  return prisma.user.delete({
    where: {
      id: userId,
    },
  });
}


}

export const userRepository = new UserRepository();