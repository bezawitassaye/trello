// src/utils/logger.ts
import winston from "winston";
import pool from "../db"; // your existing postgres pool

// 1) configure winston logger for file output
const logger = winston.createLogger({
    level: "info",
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({
            filename: "audit.log",
            level: "info",
            maxsize: 5 * 1024 * 1024, // rotate-ish: 5MB
            maxFiles: 5,
        }),
    ],
    exitOnError: false,
});

// If in development you also want console logs
if (process.env.NODE_ENV !== "production") {
    logger.add(
        new winston.transports.Console({
            format: winston.format.simple(),
        })
    );
}

// 2) main function that writes to both file and DB
export async function auditLog(
    level: "info" | "warn" | "error" | "security",
    userId: number | null,
    ipAddress: string | null,
    action: string,
    details: object | null
) {
    try {
        // 2a) file write using winston
        const message = {
            timestamp: new Date().toISOString(),
            level,
            userId,
            ipAddress,
            action,
            details,
        };
        logger.log({
            level: level === "security" ? "warn" : level,
            message: JSON.stringify(message),
        });
        // 2b) write into DB
        // keep DB writes non-blocking but await to ensure persistence in critical flows
        const query = `
      INSERT INTO auditLogs (level, user_id, ip_address, action, details)
      VALUES ($1, $2, $3, $4, $5)
    `;
        await pool.query(query, [
            level,
            userId,
            ipAddress,
            action,
            details ? JSON.stringify(details) : null,
        ]);
    } catch (err) {
        // If DB write fails, still keep file logging — we still logged with winston above.
        // We do not throw here because logging failures should not crash the app.
        logger.error("Failed to write audit log to DB", { error: err, action });
    }
}

// helpers
export const logInfo = (userId: number | null, ip: string | null, action: string, details?: object) =>
    auditLog("info", userId, ip, action, details || null);

export const logWarn = (userId: number | null, ip: string | null, action: string, details?: object) =>
    auditLog("warn", userId, ip, action, details || null);

export const logError = (userId: number | null, ip: string | null, action: string, details?: object) =>
    auditLog("error", userId, ip, action, details || null);

export const logSecurity = (userId: number | null, ip: string | null, action: string, details?: object) =>
    auditLog("security", userId, ip, action, details || null);

// expose winston logger if you need direct access
export default logger;
