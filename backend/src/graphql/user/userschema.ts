import { buildSchema } from "graphql";

const schema = buildSchema(`
  type User {
    id: ID!
    name: String!
    email: String!
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  type Query {
    me(token: String!): User
  }

  type Mutation {
    # User auth
    signup(name: String!, email: String!, password: String!): AuthPayload
    login(email: String!, password: String!): AuthPayload
    
    # Password management
    forgotPassword(email: String!): String
    updatePassword(token: String!, newPassword: String!): String
    
    # Admin features
    banUser(adminToken: String!, userId: ID!): String
    unbanUser(adminToken: String!, userId: ID!): String
    adminResetPassword(adminToken: String!, userId: ID!, newPassword: String!): String
  }
`);

export default schema;
