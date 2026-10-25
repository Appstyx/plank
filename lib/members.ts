import { randomBytes } from "node:crypto";
import { one, query, transaction } from "./db";
import type { Role } from "./permissions";

export type Member = { user_id: string; name: string; email: string; role: Role; joined_at: Date };
export type Invitation = { id: string; email: string; token: string; invited_by_name: string; created_at: Date };

export function membersOf(workspaceId: string): Promise<Member[]> {
  return query<Member>(
    `select m.user_id, u.name, u.email, m.role, m.created_at as joined_at from memberships m
     join users u on u.id = m.user_id where m.workspace_id = $1
     order by m.role = 'owner' desc, u.name`,
    [workspaceId],
  );
}

export function pendingInvitations(workspaceId: string): Promise<Invitation[]> {
  return query<Invitation>(
    `select i.id, i.email, i.token, u.name as invited_by_name, i.created_at from invitations i
     join users u on u.id = i.invited_by where i.workspace_id = $1 and i.accepted_at is null
     order by i.created_at desc`,
    [workspaceId],
  );
}

// Returns the token for the invitation link. Inviting the same address twice reuses the open invitation.
export async function invite(workspaceId: string, email: string, invitedBy: string): Promise<string> {
  const open = await one<{ token: string }>(
    "select token from invitations where workspace_id = $1 and lower(email) = lower($2) and accepted_at is null",
    [workspaceId, email],
  );
  if (open) return open.token;
  const token = randomBytes(24).toString("base64url");
  await query("insert into invitations (workspace_id, email, token, invited_by) values ($1, $2, $3, $4)", [workspaceId, email, token, invitedBy]);
  return token;
}

export function invitationByToken(token: string) {
  return one<{ id: string; email: string; workspace_id: string; workspace_name: string; workspace_slug: string; accepted_at: Date | null }>(
    `select i.id, i.email, i.workspace_id, w.name as workspace_name, w.slug as workspace_slug, i.accepted_at
     from invitations i join workspaces w on w.id = i.workspace_id where i.token = $1`,
    [token],
  );
}

// The invitation is for one address: accepting it signed in as someone else does nothing.
export function acceptInvitation(token: string, user: { id: string; email: string }): Promise<string | undefined> {
  return transaction(async (client) => {
    const { rows } = await client.query<{ workspace_id: string; slug: string }>(
      `update invitations i set accepted_at = now() from workspaces w
       where i.token = $1 and i.accepted_at is null and lower(i.email) = lower($2) and w.id = i.workspace_id
       returning i.workspace_id, w.slug`,
      [token, user.email],
    );
    if (!rows[0]) return undefined;
    await client.query(
      "insert into memberships (workspace_id, user_id, role) values ($1, $2, 'member') on conflict do nothing",
      [rows[0].workspace_id, user.id],
    );
    return rows[0].slug;
  });
}

export async function revokeInvitation(workspaceId: string, invitationId: string): Promise<void> {
  await query("delete from invitations where workspace_id = $1 and id = $2 and accepted_at is null", [workspaceId, invitationId]);
}

export async function ownerCount(workspaceId: string): Promise<number> {
  return (await one<{ count: number }>("select count(*)::int as count from memberships where workspace_id = $1 and role = 'owner'", [workspaceId]))!.count;
}

// Unassigns the member's open tasks in this workspace so nothing stays assigned to someone who left.
export function removeMember(workspaceId: string, userId: string): Promise<void> {
  return transaction(async (client) => {
    await client.query(
      `update tasks set assignee_id = null, updated_at = now()
       where assignee_id = $2 and status <> 'done' and project_id in (select id from projects where workspace_id = $1)`,
      [workspaceId, userId],
    );
    await client.query("delete from memberships where workspace_id = $1 and user_id = $2", [workspaceId, userId]);
  });
}
