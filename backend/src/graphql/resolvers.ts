import { createUser, findUserByEmail } from "../models/userModel";
import type { User } from "../models/userModel";
import pool from "../db"; // for user_devices table
import bcrypt from "bcrypt";
import { generateToken, verifyToken } from "../auth/jwt";

const resolvers = {
  signup: async ({ name, email, password }: { name: string; email: string; password: string }) => {
    const existingUser = await findUserByEmail(email);
    if (existingUser) throw new Error("User already exists");

    const user = await createUser({ name, email, password });
    const token = generateToken(user.id);

    return { token, user };
  },

  login: async (
    { email, password }: { email: string; password: string },
    req: any // need request info for device metadata
  ) => {
    const user = await findUserByEmail(email);
    if (!user) throw new Error("User not found");

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new Error("Invalid password");

    // Generate tokens
    const accessToken = generateToken(user.id); // short-lived
    const refreshToken = generateToken(user.id); // long-lived (can customize expiry)

    // Save refresh token and device info
    await pool.query(
      `INSERT INTO user_devices 
        (user_id, refresh_token, ip_address, user_agent, login_time, is_revoked) 
       VALUES ($1, $2, $3, $4, NOW(), FALSE)`,
      [user.id, refreshToken, req.ip, req.headers["user-agent"] || ""]
    );

    return { token: accessToken, refreshToken, user };
  },

  me: async ({ token }: { token: string }) => {
    const decoded: any = verifyToken(token);
    if (!decoded) throw new Error("Invalid token");

    const user = await findUserByEmail(decoded.userId);
    return user;
  },
};

export default resolvers;
