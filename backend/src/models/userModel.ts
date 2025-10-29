import pool from "../db";
import bcrypt from "bcrypt";

export interface User {
  id?: number;
  name: string;
  email: string;
  password: string;
}

export const createUser = async (user: User) => {
  const hashedPassword = await bcrypt.hash(user.password, 10);
  const result = await pool.query(
    "INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email",
    [user.name, user.email, hashedPassword]
  );
  return result.rows[0];
};

export const findUserByEmail = async (email: string) => {
  const result = await pool.query("SELECT * FROM users WHERE email=$1", [email]);
  return result.rows[0];
};
