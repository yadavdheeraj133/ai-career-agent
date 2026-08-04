import bcrypt from "bcrypt";
import { authRepository } from "../repositories/auth.repository.js";
import { RegisterInput } from "../validators/auth/register.validator.js";
import { LoginInput } from "../validators/auth/login.validator.js";
import { generateToken } from "../utils/jwt.js";

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
}

export const authService = new AuthService();
