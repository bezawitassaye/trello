import { createUser, findUserByEmail } from "../../models/userModel";
import type { User } from "../../models/userModel";
import pool from "../../db"; // for user_devices and password_resets table
import bcrypt from "bcrypt";
import crypto from "crypto";
import { generateToken,verifyToken } from "../../auth/jwt";
import { requireAdmin } from "../../middleware/requireAdmin";

const resolvers = {
  // ------------------- Signup -------------------
  signup: async (
    { name, email, password }: { name: string; email: string; password: string },
    req: any // request object for IP and user-agent
  ) => {
    const existingUser = await findUserByEmail(email);
    if (existingUser) throw new Error("User already exists");

    const user = await createUser({ name, email, password });

    const accessToken = generateToken(user.id);  // short-lived
    const refreshToken = generateToken(user.id); // long-lived

    await pool.query(
      `INSERT INTO user_devices 
        (user_id, refresh_token, ip_address, user_agent, login_time, is_revoked)
       VALUES ($1, $2, $3, $4, NOW(), FALSE)`,
      [user.id, refreshToken, req.ip, req.headers["user-agent"] || ""]
    );

    return { token: accessToken, refreshToken, user };
  },

  // ------------------- Forgot Password -------------------
  forgotPassword: async ({ email }: { email: string }) => {
    const user = await findUserByEmail(email);
    if (!user) throw new Error("User not found");

    // Generate a random reset token (mock email sending)
    const resetToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiry

    // Save token in database
    await pool.query(
      `INSERT INTO password_resets (user_id, reset_token, expires_at, used)
       VALUES ($1, $2, $3, FALSE)`,
      [user.id, resetToken, expiresAt]
    );

    // Mock sending email
    console.log(`Password reset link (mock): http://example.com/reset-password?token=${resetToken}`);

    return "Password reset link has been sent to your email (mock).";
  },

  // ------------------- Update Password -------------------
  updatePassword: async ({ token, newPassword }: { token: string; newPassword: string }) => {
    // Verify token exists and not used
    const result = await pool.query(
      `SELECT * FROM password_resets WHERE reset_token=$1 AND used=FALSE`,
      [token]
    );
    const reset = result.rows[0];
    if (!reset) throw new Error("Invalid or used token");
    if (new Date(reset.expires_at) < new Date()) throw new Error("Token expired");

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user's password
    await pool.query(
      `UPDATE users SET password=$1 WHERE id=$2`,
      [hashedPassword, reset.user_id]
    );

    // Mark token as used
    await pool.query(`UPDATE password_resets SET used=TRUE WHERE id=$1`, [reset.id]);

    return "Password updated successfully!";
  }
};

const isAdmin = async (token: string) => {
  const decoded: any = verifyToken(token);
  if (!decoded) throw new Error("Invalid token");

  const result = await pool.query("SELECT role FROM users WHERE id=$1", [decoded.userId]);
  const user = result.rows[0];
  if (!user || user.role !== "ADMIN") throw new Error("Admin privileges required");
  return true;
};


const adminResolvers = {
  banUser: async ({ adminToken, userId }: { adminToken: string; userId: number }) => {
    const admin = await requireAdmin(adminToken); // ✅ Protect the route

    await pool.query("UPDATE users SET status='BANNED' WHERE id=$1", [userId]);

    await pool.query(
      "INSERT INTO security_logs (user_id, action, created_at) VALUES ($1, $2, NOW())",
      [userId, "BANNED"]
    );

    return `User (ID: ${userId}) banned by admin ${admin.email}`;
  },

  unbanUser: async ({ adminToken, userId }: { adminToken: string; userId: number }) => {
    const admin = await requireAdmin(adminToken); // ✅ Protect again

    await pool.query("UPDATE users SET status='ACTIVE' WHERE id=$1", [userId]);
    await pool.query(
      "INSERT INTO security_logs (user_id, action, created_at) VALUES ($1, $2, NOW())",
      [userId, "UNBANNED"]
    );

    return `User (ID: ${userId}) unbanned by admin ${admin.email}`;
  },

  adminResetPassword: async ({ adminToken, userId, newPassword }: any) => {
    const admin = await requireAdmin(adminToken); // ✅ Only admins

    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query("UPDATE users SET password=$1 WHERE id=$2", [hashed, userId]);
    await pool.query(
      "INSERT INTO security_logs (user_id, action, created_at) VALUES ($1, $2, NOW())",
      [userId, "PASSWORD_RESET_BY_ADMIN"]
    );

    return `Password reset for user (ID: ${userId}) by admin ${admin.email}`;
  },
};


export default {
  ...resolvers,
  ...adminResolvers
};

