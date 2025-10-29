import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

const SECRET = process.env.JWT_SECRET || "secret";

export const generateToken = (userId: number) => {
  return jwt.sign({ userId }, SECRET, { expiresIn: "1d" });
};

export const verifyToken = (token: string) => {
  try {
    return jwt.verify(token, SECRET);
  } catch (err) {
    return null;
  }
};

export const generateRefreshToken = (userId: number) => {
  // Long-lived token (e.g., 7 days)
  return jwt.sign({ userId }, SECRET, { expiresIn: "7d" });
};

export const getUserIdFromToken = (token: string): number => {
  const decoded: any = verifyToken(token);
  return decoded.userId;
};
