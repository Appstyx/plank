import { randomBytes } from "node:crypto";
import { one, query, transaction } from "./db";
import type { Role } from "./permissions";

// projects lists the projects a guest is on; it's empty for owners and members, who see them all.
export type Member = { user_id: string; name: string; email: string; role: Role; projects: string[]; joined_at: Date };
export type Invitation = { id: string; email: string; token: string; role: Role; projects: string[]; invited_by_name: string; created_at: Date };

export function membersOf(workspaceId: string): Promise<Member[]> {
  return query<Member>(
    `select m.user_id, u.name, u.email, m.role, m.created_at as joined_at,
       array(select p.name from project_guests g join projects p on p.id = g.project_id
             where g.workspace_id = m.workspace_id and g.user_id = m.user_id order by p.name) as projects
     from memberships m join users u on u.id = m.user_id where m.workspace_id = $1
     order by m.role = 'owner' desc, m.role = 'guest', u.name`,
    [workspaceId],
  );
}

export function pendingInvitations(workspaceId: string): Promise<Invitation[]> {
  return query<Invitation>(
    `select i.id, i.email, i.token, i.role, u.name as invited_by_name, i.created_at,
       array(select p.name from invitation_projects ip join projects p on p.id = ip.project_id
             where ip.invitation_id = i.id order by p.name) as projects
     from invitations i join users u on u.id = i.invited_by where i.workspace_id = $1 and i.accepted_at is null
     order by i.created_at desc`,
    [workspaceId],
  );
}

// Returns the token for the invitation link. Inviting the same address twice reuses the open invitation,
// with the role and projects of the latest one, so a link that's already been sent keeps working.
export function invite(workspaceId: string, email: string, invitedBy: string, role: "member" | "guest", projectIds: string[] = []): Promise<string> {
  return transaction(async (client) => {
    const open = await client.query<{ id: string; token: string }>(
      "select id, token from invitations where workspace_id = $1 and lower(email) = lower($2) and accepted_at is null for update",
      [workspaceId, email],
    );
    let invitation = open.rows[0];
    if (invitation) {
      await client.query("update invitations set role = $2 where id = $1", [invitation.id, role]);
      await client.query("delete from invitation_projects where invitation_id = $1", [invitation.id]);
    } else {
      const token = randomBytes(24).toString("base64url");
      invitation = (
        await client.query<{ id: string; token: string }>(
          "insert into invitations (workspace_id, email, token, invited_by, role) values ($1, $2, $3, $4, $5) returning id, token",
          [workspaceId, email, token, invitedBy, role],
        )
      ).rows[0];
    }
    await client.query("insert into invitation_projects (invitation_id, project_id) select $1, unnest($2::uuid[])", [invitation.id, projectIds]);
    return invitation.token;
  });
}

export function invitationByToken(token: string) {
  return one<{ id: string; email: string; role: Role; projects: string[]; workspace_id: string; workspace_name: string; workspace_slug: string; accepted_at: Date | null }>(
    `select i.id, i.email, i.role, i.workspace_id, w.name as workspace_name, w.slug as workspace_slug, i.accepted_at,
       array(select p.name from invitation_projects ip join projects p on p.id = ip.project_id
             where ip.invitation_id = i.id order by p.name) as projects
     from invitations i join workspaces w on w.id = i.workspace_id where i.token = $1`,
    [token],
  );
}

// The invitation is for one address: accepting it signed in as someone else does nothing.
export function acceptInvitation(token: string, user: { id: string; email: string }): Promise<string | undefined> {
  return transaction(async (client) => {
    const { rows } = await client.query<{ id: string; workspace_id: string; role: Role; slug: string }>(
      `update invitations i set accepted_at = now() from workspaces w
       where i.token = $1 and i.accepted_at is null and lower(i.email) = lower($2) and w.id = i.workspace_id
       returning i.id, i.workspace_id, i.role, w.slug`,
      [token, user.email],
    );
    if (!rows[0]) return undefined;
    await client.query("insert into memberships (workspace_id, user_id, role) values ($1, $2, $3) on conflict do nothing", [
      rows[0].workspace_id,
      user.id,
      rows[0].role,
    ]);
    await client.query(
      `insert into project_guests (workspace_id, user_id, project_id)
       select $2, $3, project_id from invitation_projects where invitation_id = $1 on conflict do nothing`,
      [rows[0].id, rows[0].workspace_id, user.id],
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
// A guest's project access goes with the membership row.
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
