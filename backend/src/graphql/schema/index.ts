import { buildSchema } from "graphql";

const schema = buildSchema(`
  # --- Types ---
  type User {
    id: ID!
    name: String!
    email: String!
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  type Workspace {
    id: ID!
    name: String!
    createdBy: ID
    createdAt: String
    members: [WorkspaceMember!]!
  }

  type WorkspaceMember {
    userId: ID       # nullable for invited users
    role: String!
    joinedAt: String
  }

  type Project {
    id: ID!
    workspaceId: ID!
    name: String!
    createdBy: ID
    createdAt: String
  }

  type ProjectMember {
    userId: ID!
    role: String!
  }

  # --- Queries ---
  type Query {
    me(token: String!): User
    getWorkspace(workspaceId: ID!, token: String!): Workspace
    getAllWorkspaces(adminToken: String!): [Workspace!]!
  }

  # --- Mutations ---
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

    # Workspace management
    createWorkspace(name: String!, token: String!): Workspace
    removeWorkspaceMember(workspaceId: ID!, userId: ID!, token: String!): String
    updateWorkspaceMemberRole(workspaceId: ID!, userId: ID!, role: String!, token: String!): String
    addWorkspaceMemberByEmail(
      workspaceId: ID!
      email: String!
      role: String
      token: String!
    ): WorkspaceMember

    # Project endpoints (outline)
    createProject(workspaceId: ID!, name: String!, token: String!): Project
    updateProjectMemberRole(projectId: ID!, userId: ID!, role: String!, token: String!): String
  }
`);

export default schema;
