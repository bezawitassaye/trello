import { createUser, findUserByEmail } from "../models/userModel";
import type { User } from "../models/userModel";
import pool from "../db"; // for user_devices table
import bcrypt from "bcrypt";
import { generateToken } from "../auth/jwt";

const resolvers = {
  signup: async (
    { name, email, password }: { name: string; email: string; password: string },
    req: any // request object for IP and user-agent
  ) => {
    // 1️⃣ Check if user already exists
    const existingUser = await findUserByEmail(email);
    if (existingUser) throw new Error("User already exists");

    // 2️⃣ Create user
    const user = await createUser({ name, email, password });

    // 3️⃣ Generate tokens
    const accessToken = generateToken(user.id);  // short-lived
    const refreshToken = generateToken(user.id); // long-lived

    // 4️⃣ Save refreshToken + device info
    await pool.query(
      `INSERT INTO user_devices 
        (user_id, refresh_token, ip_address, user_agent, login_time, is_revoked)
       VALUES ($1, $2, $3, $4, NOW(), FALSE)`,
      [user.id, refreshToken, req.ip, req.headers["user-agent"] || ""]
    );

    // 5️⃣ Return both tokens + user info
    return { token: accessToken, refreshToken, user };
  },
};

export default resolvers;
