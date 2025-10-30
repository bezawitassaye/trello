import express from "express";
import pool from "../db";
import { verifyToken } from "../auth/jwt";

const router = express.Router();

// Save subscription (frontend posts subscription and token)
router.post("/subscribe", async (req, res) => {
  try {
    const { subscription, token } = req.body; // subscription: { endpoint, keys }
    const decoded: any = verifyToken(token);
    const userId = decoded.userId;
    await pool.query(
      `INSERT INTO user_subscriptions (user_id, endpoint, keys) VALUES ($1, $2, $3)
       ON CONFLICT (user_id, endpoint) DO UPDATE SET keys = EXCLUDED.keys, created_at = NOW()`,
      [userId, subscription.endpoint, subscription.keys]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save subscription" });
  }
});

router.post("/unsubscribe", async (req, res) => {
  try {
    const { endpoint, token } = req.body;
    const decoded: any = verifyToken(token);
    const userId = decoded.userId;
    await pool.query("DELETE FROM user_subscriptions WHERE user_id=$1 AND endpoint=$2", [userId, endpoint]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to remove subscription" });
  }
});

export default router;
