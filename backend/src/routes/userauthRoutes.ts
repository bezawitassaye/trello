// src/routes/auth.ts
import express from "express";
import bcrypt from "bcrypt";
import pool from "../db";
import { generateToken, verifyToken } from "../auth/jwt";
import { logInfo, logSecurity } from "../utils/logger"; // ✅ import your logger
import { authLimiter } from "../middleware/rateLimiter";

const router = express.Router();

// Login
router.post("/login",authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query("SELECT * FROM users WHERE email=$1", [email]);
    const user = result.rows[0];

    if (!user) {
      // Log failed login attempt
      const ipAddress = req.ip || null;
      await logSecurity(null,ipAddress, "LOGIN_FAILURE", { email });
      return res.status(404).json({ message: "User not found" });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      // Log failed login attempt
      const ipAddress = req.ip || null;
await logSecurity(user.id, ipAddress, "LOGIN_FAILURE", { email });return res.status(401).json({ message: "Invalid password" });
    }

    const accessToken = generateToken(user.id);
    const refreshToken = generateToken(user.id);

    await pool.query(
      `INSERT INTO user_devices
        (user_id, refresh_token, ip_address, user_agent, login_time, is_revoked)
       VALUES ($1, $2, $3, $4, NOW(), FALSE)`,
      [user.id, refreshToken, req.ip, req.headers["user-agent"] || ""]
    );

    // ✅ Log successful login
     const ipAddress = req.ip || null;
    await logInfo(user.id, ipAddress, "LOGIN_SUCCESS", { userAgent: req.headers["user-agent"] });

    res.json({ accessToken, refreshToken, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error(err);
    // ✅ Log server error
    const ipAddress = req.ip || null;

if (err instanceof Error) {
  // TypeScript now knows err has 'message'
  await logSecurity(null, ipAddress, "LOGIN_ERROR", { error: err.message });
} else {
  // fallback if it's not an Error object
  await logSecurity(null, ipAddress, "LOGIN_ERROR", { error: String(err) });
}
res.status(500).json({ message: "Server error" });
  }
});

// Refresh token
router.post("/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const result = await pool.query(
      "SELECT * FROM user_devices WHERE refresh_token=$1 AND is_revoked=FALSE",
      [refreshToken]
    );

    const device = result.rows[0];
    if (!device) {
      const ipAddress = req.ip || null;
      await logSecurity(null, ipAddress, "REFRESH_FAILURE", {});
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const decoded: any = verifyToken(refreshToken);
    if (!decoded) {
       const ipAddress = req.ip || null;
      await logSecurity(null, ipAddress, "REFRESH_FAILURE", {});
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const accessToken = generateToken(decoded.userId);
    const ipAddress = req.ip || null;
    await logInfo(decoded.userId, ipAddress, "REFRESH_SUCCESS");
    res.json({ accessToken });
  } catch (err) {
    console.error(err);
    const ipAddress = req.ip || null;
    if (err instanceof Error) {
      await logSecurity(null, ipAddress, "REFRESH_ERROR", { error: err.message });
    } else {
      await logSecurity(null, ipAddress, "REFRESH_ERROR", { error: String(err) });
    }
    res.status(500).json({ message: "Server error" });
  }
});

// Logout
router.post("/logout", async (req, res) => {
  try {
    const { refreshToken } = req.body;

    const result = await pool.query(
      "UPDATE user_devices SET is_revoked=TRUE WHERE refresh_token=$1 RETURNING user_id",
      [refreshToken]
    );

    const userId = result.rows[0]?.user_id || null;
      const ipAddress = req.ip || null;
    await logInfo(userId, ipAddress, "LOGOUT_SUCCESS");
    res.json({ message: "Logged out successfully" });
  } catch (err) {
    console.error(err);
    const ipAddress = req.ip || null;
    if (err instanceof Error) {
      await logSecurity(null, ipAddress, "LOGOUT_ERROR", { error: err.message });
    } else {
      await logSecurity(null, ipAddress, "LOGOUT_ERROR", { error: String(err) });
    }
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
