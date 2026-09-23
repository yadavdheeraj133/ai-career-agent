import { User } from "@prisma/client";

type SafeUser = Omit<User, "password">;

declare global {
  namespace Express {
    interface Request {
      user: SafeUser;
    }
  }
}

export {};