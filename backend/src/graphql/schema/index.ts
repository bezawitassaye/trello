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
    workspaceId: ID
    name: String!
    createdBy: ID
    createdAt: String
    members: [ProjectMember!]!
  }

  type ProjectMember {
    userId: ID!
    role: String!
    joinedAt: String
  }

  type Task {
    id: ID!
    projectId: ID!
    title: String!
    description: String
    status: String!
    assignedToIds: [ID!]!
  }

  type Notification {
    id: ID!
    title: String!
    body: String!
    recipientId: ID!
    status: String!
    relatedEntityId: ID
    createdAt: String
  }

  type Subscription {
    taskStatusUpdated(workspaceId: ID!): Task
  }

  type RemoveResponse {
  success: Boolean!
  message: String!
}

  # --- Queries ---
  type Query {
    me(token: String!): User
    getWorkspace(workspaceId: ID!, token: String!): Workspace
    getAllWorkspaces(adminToken: String!): [Workspace!]!
    summarizeTask(taskId: Int!): String
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

    # Project management
    createProject(workspaceId: ID!, name: String!, token: String!): Project
    updateProjectMemberRole(projectId: ID!, userId: ID!, role: String!, token: String!): String

    # Task management
    createTask(projectId: ID!, title: String!, description: String, assignedToIds: [ID!]!, token: String!): Task
    updateTask(taskId: ID!, title: String, description: String, status: String, assignedToIds: [ID!], token: String!): Task
    generateTasksFromPrompt(projectId: ID!, prompt: String!, token: String!): [Task!]!

    # Notifications
    markNotificationAsSeen(notificationId: ID!, token: String!): Notification
 
   
   removeProjectMember(projectId: ID!, userId: ID!, token: String!): RemoveResponse!

    }
`);

export default schema;
