import express from "express";
import bcrypt from "bcrypt";
import pool from "../db";
import { generateToken, verifyToken } from "../auth/jwt";

const router = express.Router();

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;


    const result = await pool.query("SELECT * FROM users WHERE email=$1", [email]);
    const user = result.rows[0];
    if (!user) return res.status(404).json({ message: "User not found" });


    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: "Invalid password" });


    const accessToken = generateToken(user.id);
    const refreshToken = generateToken(user.id);


    await pool.query(
      `INSERT INTO user_devices
        (user_id, refresh_token, ip_address, user_agent, login_time, is_revoked)
       VALUES ($1, $2, $3, $4, NOW(), FALSE)`,
      [user.id, refreshToken, req.ip, req.headers["user-agent"] || ""]
    );


    res.json({ accessToken, refreshToken, user: { id: user.id, name: user.name, email: user.email } });

  } catch (err) {
    console.error(err);
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
