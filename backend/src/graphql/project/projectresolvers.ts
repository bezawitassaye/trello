import { verifyToken } from "../../auth/jwt";
import pool from "../../db";

// --- Types ---
type MyJwtPayload = {
  userId: number;
  email?: string;
  role?: string;
};

interface CreateProjectArgs {
  workspaceId: number;
  name: string;
  token: string;
}

interface UpdateProjectMemberRoleArgs {
  projectId: number;
  userId: number;
  role: string;
  token: string;
}

// --- Resolvers ---
export const projectResolvers = {
  // Create a new project
  createProject: async ({ workspaceId, name, token }: CreateProjectArgs) => {
    const decoded = verifyToken(token) as MyJwtPayload;

    // 1️⃣ Ensure user is part of workspace
    const { rows: workspaceMember } = await pool.query(
      "SELECT * FROM workspace_members WHERE workspace_id=$1 AND user_id=$2",
      [workspaceId, decoded.userId]
    );
    if (!workspaceMember.length) throw new Error("Not a workspace member");

    // 2️⃣ Insert project record
    const { rows: project } = await pool.query(
      `INSERT INTO projects (name, workspace_id, created_by, created_at)
       VALUES ($1, $2, $3, NOW()) RETURNING *`,
      [name, workspaceId, decoded.userId]
    );

    // 3️⃣ Add creator as Project Lead
    await pool.query(
      `INSERT INTO project_members (project_id, user_id, role, joined_at)
   VALUES ($1, $2, 'OWNER', NOW())`,
      [project[0].id, decoded.userId]
    );


    return project[0];
  },

  // Update a project member’s role
  updateProjectMemberRole: async ({
    projectId,
    userId,
    role,
    token,
  }: UpdateProjectMemberRoleArgs) => {
    const decoded = verifyToken(token) as MyJwtPayload;

    // Check if requester is a project LEAD
    const { rows: requester } = await pool.query(
      `SELECT role FROM project_members WHERE project_id=$1 AND user_id=$2`,
      [projectId, decoded.userId]
    );

    if (!requester.length || !["LEAD"].includes(requester[0].role)) {
      throw new Error("Unauthorized: Only project leads can change roles.");
    }

    // Update member’s role
    await pool.query(
      `UPDATE project_members SET role=$1 WHERE project_id=$2 AND user_id=$3`,
      [role, projectId, userId]
    );

    return "Role updated successfully.";
  },
};

export default projectResolvers;
