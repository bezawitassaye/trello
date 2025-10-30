import rateLimit from "express-rate-limit";
import { logSecurity } from "../utils/logger";
// src/middleware/rateLimiter.ts
const signupAttempts: Record<string, { count: number; lastAttempt: number }> = {};
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_ATTEMPTS = 5;

export function signupRateLimiter(ip: string) {
  const now = Date.now();
  if (!signupAttempts[ip]) {
    signupAttempts[ip] = { count: 1, lastAttempt: now };
    return;
  }

  const delta = now - signupAttempts[ip].lastAttempt;

  if (delta > WINDOW_MS) {
    // Reset after window
    signupAttempts[ip] = { count: 1, lastAttempt: now };
    return;
  }

  signupAttempts[ip].count += 1;
  signupAttempts[ip].lastAttempt = now;

  if (signupAttempts[ip].count > MAX_ATTEMPTS) {
    throw new Error("Too many signup attempts. Please try again later.");
  }
}

// Rate limiter for login
export const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5, // max 5 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  handler: async (req, res) => {
    const ipAddress = req.ip || null;
    await logSecurity(null, ipAddress, "RATE_LIMIT_TRIGGERED", { endpoint: req.originalUrl });
    res.status(429).json({ error: "Too many requests. Please try again later." });
  },
});
