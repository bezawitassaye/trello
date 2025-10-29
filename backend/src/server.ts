import express from "express";
import cors from "cors";
import { graphqlHTTP } from "express-graphql";
import schema from "./graphql/schema";
import resolvers from "./graphql/resolvers";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes"; // <- REST endpoints

dotenv.config();
const app = express();

// Enable CORS (allow credentials for cookies)
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());

// REST endpoints for token management
app.use("/api/auth", authRoutes);

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
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`📦 GraphQL endpoint: http://localhost:${PORT}/graphql`);
});
