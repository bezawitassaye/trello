import { buildSchema } from "graphql";

const schema = buildSchema(`
  type Workspace {
    id: ID!
    name: String!
    createdBy: ID
    createdAt: String
    members: [WorkspaceMember!]!
  }

  type WorkspaceMember {
    userId: ID!
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

  # Queries
  type Query {
    getWorkspace(workspaceId: ID!, token: String!): Workspace
    getAllWorkspaces(adminToken: String!): [Workspace!]!
  }

  # Mutations
  type Mutation {
    createWorkspace(name: String!, token: String!): Workspace
    addWorkspaceMember(workspaceId: ID!, userId: ID!, role: String, token: String!): String
    removeWorkspaceMember(workspaceId: ID!, userId: ID!, token: String!): String
    updateWorkspaceMemberRole(workspaceId: ID!, userId: ID!, role: String!, token: String!): String

    # Project endpoints (outline)
    createProject(workspaceId: ID!, name: String!, token: String!): Project
    updateProjectMemberRole(projectId: ID!, userId: ID!, role: String!, token: String!): String
  }
`);

export default schema;
