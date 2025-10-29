import pool from "../db";

export type WorkspaceRole = 'OWNER'|'MEMBER'|'VIEWER';
export type ProjectRole = 'PROJECT_LEAD'|'CONTRIBUTOR'|'PROJECT_VIEWER';

export async function getWorkspaceMemberRole(userId: number, workspaceId: number): Promise<WorkspaceRole | null> {
  const res = await pool.query(
    'SELECT role FROM workspace_members WHERE user_id=$1 AND workspace_id=$2',
    [userId, workspaceId]
  );
  return res.rows[0]?.role ?? null;
}

export async function ensureAtLeastViewer(userId: number, workspaceId: number) {
  const role = await getWorkspaceMemberRole(userId, workspaceId);
  if (!role) throw new Error('Access denied: not a workspace member');
  // any role in the enum suffices
  return role;
}

export async function ensureOwner(userId: number, workspaceId: number) {
  const role = await getWorkspaceMemberRole(userId, workspaceId);
  if (role !== 'OWNER') throw new Error('Access denied: owner only');
  return role;
}

export async function ensureMemberOrOwner(userId: number, workspaceId: number) {
  const role = await getWorkspaceMemberRole(userId, workspaceId);
  if (role === 'OWNER' || role === 'MEMBER') return role;
  throw new Error('Access denied: workspace member required');
}
