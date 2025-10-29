import jwt from "jsonwebtoken";
import pool from "../db.js";

interface JwtPayload {
  userId: number;
}

export const requireAdmin = async (token: string) => {
  if (!token) throw new Error("No token provided");

  const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;

  const result = await pool.query("SELECT * FROM users WHERE id = $1", [decoded.userId]);
  const user = result.rows[0];

  if (!user || user.role !== "ADMIN") {
    throw new Error("Access denied: Admins only");
  }

  return user;
};
