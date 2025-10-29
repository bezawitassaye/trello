import express from "express";
import pool from "../db";
import { generateToken, verifyToken } from "../auth/jwt";

const router = express.Router();

// Refresh token
router.post("/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const result = await pool.query(
      "SELECT * FROM user_devices WHERE refresh_token=$1 AND is_revoked=FALSE",
      [refreshToken]
    );

    const device = result.rows[0];
    if (!device) return res.status(401).json({ message: "Invalid refresh token" });

    const decoded: any = verifyToken(refreshToken);
    if (!decoded) return res.status(401).json({ message: "Invalid refresh token" });

    const accessToken = generateToken(decoded.userId);
    res.json({ accessToken });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Logout
router.post("/logout", async (req, res) => {
  try {
    const { refreshToken } = req.body;
    await pool.query(
      "UPDATE user_devices SET is_revoked=TRUE WHERE refresh_token=$1",
      [refreshToken]
    );
    res.json({ message: "Logged out successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
