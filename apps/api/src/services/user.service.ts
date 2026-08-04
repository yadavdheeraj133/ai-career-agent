import { userRepository } from "../repositories/user.repository.js";
import { UpdateProfileInput } from "../validators/auth/update-profile.validator.js";


export class UserService {
  async getProfile(userId: string) {
    const user = await userRepository.getProfile(userId);

    if (!user) {
      throw new Error("User not found");
    }

    return user;
  }

  async updateProfile(userId: string, data: UpdateProfileInput) {
  const user = await userRepository.getProfile(userId);

  if (!user) {
    throw new Error("User not found");
  }

  return userRepository.updateProfile(userId, data);
}

async deleteProfile(userId: string) {
  const user = await userRepository.getProfile(userId);

  if (!user) {
    throw new Error("User not found");
  }

  await userRepository.deleteProfile(userId);

  return;
}

}

export const userService = new UserService();