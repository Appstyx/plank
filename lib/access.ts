// Every workspace page and action starts here: who is signed in, which workspace, and their role in it.
import { notFound } from "next/navigation";
import { one } from "./db";
import { can, type Action, type Role } from "./permissions";
import { requireUser, type User } from "./session";

export type Workspace = { id: string; name: string; slug: string };
export type Access = { user: User; workspace: Workspace; role: Role };

// Someone who isn't a member gets a 404 rather than a 403, so workspace names don't leak.
export async function workspaceAccess(slug: string): Promise<Access> {
  const user = await requireUser();
  const row = await one<Workspace & { role: Role }>(
    `select w.id, w.name, w.slug, m.role from workspaces w
     join memberships m on m.workspace_id = w.id and m.user_id = $2
     where w.slug = $1`,
    [slug, user.id],
  );
  if (!row) notFound();
  const { role, ...workspace } = row;
  return { user, workspace, role };
}

export function authorize(access: Access, action: Action): void {
  if (!can(access.role, action)) throw new Error(`Your role in ${access.workspace.name} can't do that.`);
}
