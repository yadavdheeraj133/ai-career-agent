import jwt from "jsonwebtoken";

export const generateToken = (userId: string) => {
  const JWT_SECRET = process.env.JWT_SECRET;

  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined");
  }

  return jwt.sign(
    { userId },
    JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
};