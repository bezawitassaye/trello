import pool from "../../db";
import { getUserIdFromToken, verifyToken } from "../../auth/jwt"; // or helper
import { ensureOwner, ensureAtLeastViewer } from "../../auth/roles";
import { sendAddedMemberEmail, sendInvitationEmail } from "../../utils/emailService";
import { logInfo, logSecurity } from "../../utils/logger";

/**
 * createWorkspace: creator becomes OWNER
 */
export const workspaceResolvers = {
  createWorkspace: async ({ name, token }: { name: string; token: string }) => {
    const userId = getUserIdFromToken(token);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const wsRes = await client.query(
        'INSERT INTO workspaces (name, created_by) VALUES ($1, $2) RETURNING id, name, created_by, created_at',
        [name, userId]
      );
      const workspace = wsRes.rows[0];

      // assign owner role in workspace_members
      await client.query(
        'INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, $3)',
        [workspace.id, userId, 'OWNER']
      );

      await client.query('COMMIT');
      await logSecurity(
        userId,
        null, // no IP available here, unless passed in
        "WORKSPACE_CREATED",
        { workspaceId: workspace.id, name: workspace.name }
      );

      // return workspace shaped to match GraphQL type
      return {
        id: workspace.id,
        name: workspace.name,
        createdBy: workspace.created_by,
        createdAt: workspace.created_at,
        members: [{ userId, role: 'OWNER', joinedAt: new Date().toISOString() }]
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  addWorkspaceMemberByEmail: async ({ workspaceId, email, role = "MEMBER", token }: any) => {
    // ✅ Decode token and assert type
    interface MyJwtPayload {
      userId: number;
      iat: number;
      exp: number;
    }

    const decoded = verifyToken(token) as MyJwtPayload;
    if (!decoded || !decoded.userId) throw new Error("Unauthorized");

    const invitedBy = decoded.userId; // this is the workspace owner id

    // --- rest of your code ---
    const { rows: workspaceRows } = await pool.query(
      "SELECT * FROM workspaces WHERE id=$1",
      [workspaceId]
    );
    if (workspaceRows.length === 0) throw new Error("Workspace not found");

    const { rows: userRows } = await pool.query("SELECT * FROM users WHERE email=$1", [email]);
    let userId: number | null;

    if (userRows.length === 0) {
      // Add to workspace_invitations table
      await pool.query(
        `INSERT INTO workspace_invitations (workspace_id, email, invited_by, role) 
       VALUES ($1, $2, $3, $4)
       ON CONFLICT DO NOTHING`,
        [workspaceId, email, invitedBy, role]
      );

      await sendInvitationEmail(email, workspaceRows[0].name);
      await logSecurity(
        invitedBy,
        null,
        "WORKSPACE_MEMBER_INVITED",
        { workspaceId, targetUserId: null, email, role }
      );


      return { userId: null, role: "MEMBER", joinedAt: null };
    } else {
      userId = userRows[0].id;
    }

    const joinedAt = new Date().toISOString();
    await pool.query(
      `INSERT INTO workspace_members (workspace_id, user_id, role, joined_at)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT DO NOTHING`,
      [workspaceId, userId, role, joinedAt]
    );

    await sendAddedMemberEmail(email, workspaceRows[0].name);

    return { userId, role, joinedAt };
  }


  ,



  removeWorkspaceMember: async ({ workspaceId, userId, token }: any) => {
    const actorId = getUserIdFromToken(token);
    await ensureOwner(actorId, parseInt(workspaceId, 10));

    // Prevent removing the owner (find who is owner)
    const ownerRes = await pool.query('SELECT user_id FROM workspace_members WHERE workspace_id=$1 AND role=$2', [workspaceId, 'OWNER']);
    const owner = ownerRes.rows[0];
    if (owner && owner.user_id === Number(userId)) throw new Error('Cannot remove the Owner');

    await pool.query('DELETE FROM workspace_members WHERE workspace_id=$1 AND user_id=$2', [workspaceId, userId]);
    await logSecurity(
      actorId,
      null,
      "WORKSPACE_MEMBER_REMOVED",
      { workspaceId, targetUserId: userId }
    );

    return 'Member removed';
  },

  updateWorkspaceMemberRole: async ({ workspaceId, userId, role, token }: any) => {
    const actorId = getUserIdFromToken(token);
    await ensureOwner(actorId, parseInt(workspaceId, 10));

    // cannot change owner's role
    const ownerRes = await pool.query('SELECT user_id FROM workspace_members WHERE workspace_id=$1 AND role=$2', [workspaceId, 'OWNER']);
    const owner = ownerRes.rows[0];
    if (owner && owner.user_id === Number(userId)) throw new Error('Cannot change Owner role');

    // validate role
    const allowed = ['MEMBER', 'VIEWER'];
    if (!allowed.includes(role)) throw new Error('Invalid role');

    await pool.query('UPDATE workspace_members SET role=$1 WHERE workspace_id=$2 AND user_id=$3', [role, workspaceId, userId]);

    await logSecurity(
      actorId,
      null,
      "WORKSPACE_MEMBER_ROLE_UPDATED",
      { workspaceId, targetUserId: userId, newRole: role }
    );

    return 'Role updated';
  },

  getWorkspace: async ({ workspaceId, token }: any) => {
    const userId = getUserIdFromToken(token);
    await ensureAtLeastViewer(userId, parseInt(workspaceId, 10));

    const ws = await pool.query('SELECT id, name, created_by, created_at FROM workspaces WHERE id=$1', [workspaceId]);
    if (!ws.rows[0]) throw new Error('Workspace not found');
    const workspace = ws.rows[0];

    const mems = await pool.query(
      'SELECT user_id, role, joined_at FROM workspace_members WHERE workspace_id=$1',
      [workspaceId]
    );

    return {
      id: workspace.id,
      name: workspace.name,
      createdBy: workspace.created_by,
      createdAt: workspace.created_at,
      members: mems.rows.map((r: any) => ({ userId: r.user_id, role: r.role, joinedAt: r.joined_at }))
    };
  },

  getAllWorkspaces: async ({ adminToken }: any) => {
    // reuse your requireAdmin middleware (or isAdmin)
    const { requireAdmin } = await import('../../middleware/requireAdmin'); // or import top-level
    await requireAdmin(adminToken);

    const wsRes = await pool.query('SELECT id, name, created_by, created_at FROM workspaces ORDER BY id ASC');
    const workspaces = wsRes.rows;

    // fetch members per workspace
    const results = [];
    for (const w of workspaces) {
      const memRes = await pool.query('SELECT user_id, role, joined_at FROM workspace_members WHERE workspace_id=$1', [w.id]);
      results.push({
        id: w.id,
        name: w.name,
        createdBy: w.created_by,
        createdAt: w.created_at,
        members: memRes.rows.map((r: any) => ({ userId: r.user_id, role: r.role, joinedAt: r.joined_at }))
      });
    }
    return results;
  }
};

export default workspaceResolvers;