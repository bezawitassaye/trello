import express from "express";
import cors from "cors";
import { graphqlHTTP } from "express-graphql";
import dotenv from "dotenv";
import schema from "./graphql/schema";       // combined schema
import resolvers from "./graphql/resolvers"; // combined resolvers
import authRoutes from "./routes/userauthRoutes";
import pushRoutes from "./routes/pushRoutes";
import pool from "./db";
import logger, { auditLog } from "./utils/logger";

dotenv.config();
const app = express();

// Enable CORS
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());

// REST endpoints
app.use("/api/auth", authRoutes);
app.use("/api/push", pushRoutes);

// GraphQL endpoint
app.use(
  "/graphql",
  graphqlHTTP({
    schema,
    rootValue: resolvers,
    graphiql: true,
  })
);

const PORT = process.env.PORT || 4000;

// capture server instance
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`📦 GraphQL endpoint: http://localhost:${PORT}/graphql`);
});

// Graceful shutdown function
async function gracefulShutdown(signal: string) {
  console.log(`Received ${signal}. Shutting down gracefully...`);

  try {
    // log shutdown
    await auditLog("info", null, null, "SERVER_SHUTDOWN", { signal });

    // stop accepting new connections
    server.close(async () => {
      console.log("HTTP server closed.");

      // close DB pool
      await pool.end();
      console.log("Database connections closed.");

      // flush logger
      if (logger.end) logger.end();
      logger.on("finish", () => {
        console.log("Logger finished. Exiting.");
        process.exit(0);
      });

      // safety exit if logger hangs
      setTimeout(() => process.exit(0), 1000);
    });
  } catch (err) {
    console.error("Error during shutdown:", err);
    process.exit(1);
  }
}

// Listen for termination signals
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
