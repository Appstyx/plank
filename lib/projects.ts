import type { Access } from "./access";
import { one, query } from "./db";

export type Project = { id: string; name: string; archived_at: Date | null; open_tasks: number };

// Guests see only the projects they were invited to; owners and members see the whole workspace.
// Every query that reads projects or tasks for someone puts this in its where clause and passes scope(access) as $1 and $2.
export const visibleProject = `p.workspace_id = $1
  and ($2::uuid is null or p.id in (select project_id from project_guests where workspace_id = $1 and user_id = $2))`;

export function scope(access: Access): [string, string | null] {
  return [access.workspace.id, access.role === "guest" ? access.user.id : null];
}

export function projectsIn(access: Access): Promise<Project[]> {
  return query<Project>(
    `select p.id, p.name, p.archived_at,
       (select count(*)::int from tasks t where t.project_id = p.id and t.status <> 'done') as open_tasks
     from projects p where ${visibleProject}
     order by p.archived_at is not null, p.created_at`,
    scope(access),
  );
}

export function projectIn(access: Access, projectId: string): Promise<Project | undefined> {
  return one<Project>(`select p.id, p.name, p.archived_at, 0 as open_tasks from projects p where ${visibleProject} and p.id = $3`, [
    ...scope(access),
    projectId,
  ]);
}

export async function createProject(workspaceId: string, name: string): Promise<string> {
  const row = await one<{ id: string }>("insert into projects (workspace_id, name) values ($1, $2) returning id", [workspaceId, name]);
  return row!.id;
}

export async function archiveProject(workspaceId: string, projectId: string): Promise<void> {
  await query("update projects set archived_at = now() where workspace_id = $1 and id = $2 and archived_at is null", [workspaceId, projectId]);
}
