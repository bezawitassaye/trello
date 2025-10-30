import express from "express";
import cors from "cors";
import { graphqlHTTP } from "express-graphql";
import dotenv from "dotenv";
import schema from "./graphql/schema";       // combined schema
import resolvers from "./graphql/resolvers"; // combined resolvers
import authRoutes from "./routes/userauthRoutes";
import pushRoutes from "./routes/pushRoutes";
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
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`📦 GraphQL endpoint: http://localhost:${PORT}/graphql`);
});
