import pool from "../../db";
import { getUserIdFromToken } from "../../auth/jwt"; // or helper
import { ensureOwner, ensureAtLeastViewer } from "../../auth/roles";

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

  addWorkspaceMember: async ({ workspaceId, userId, role='MEMBER', token }: any) => {
    const actorId = getUserIdFromToken(token);
    await ensureOwner(actorId, parseInt(workspaceId, 10)); // only owner can add

    // cannot add OWNER via this path — owner assignment only on creation or transfer
    if (role === 'OWNER') throw new Error('Cannot assign OWNER via addWorkspaceMember');

    await pool.query(
      'INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = EXCLUDED.role',
      [workspaceId, userId, role]
    );

    // Optionally log this action to security_logs or activity
    return 'Member added/updated';
  },

  removeWorkspaceMember: async ({ workspaceId, userId, token }: any) => {
    const actorId = getUserIdFromToken(token);
    await ensureOwner(actorId, parseInt(workspaceId, 10));

    // Prevent removing the owner (find who is owner)
    const ownerRes = await pool.query('SELECT user_id FROM workspace_members WHERE workspace_id=$1 AND role=$2', [workspaceId, 'OWNER']);
    const owner = ownerRes.rows[0];
    if (owner && owner.user_id === Number(userId)) throw new Error('Cannot remove the Owner');

    await pool.query('DELETE FROM workspace_members WHERE workspace_id=$1 AND user_id=$2', [workspaceId, userId]);

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
    const allowed = ['MEMBER','VIEWER'];
    if (!allowed.includes(role)) throw new Error('Invalid role');

    await pool.query('UPDATE workspace_members SET role=$1 WHERE workspace_id=$2 AND user_id=$3', [role, workspaceId, userId]);
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