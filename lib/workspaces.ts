import { query } from "./db";
import type { Workspace } from "./access";

export function workspacesOf(userId: string): Promise<Workspace[]> {
  return query<Workspace>(
    `select w.id, w.name, w.slug from workspaces w
     join memberships m on m.workspace_id = w.id where m.user_id = $1 order by w.name`,
    [userId],
  );
}
