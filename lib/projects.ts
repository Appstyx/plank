import { one, query } from "./db";

export type Project = { id: string; name: string; archived_at: Date | null; open_tasks: number };

export function projectsIn(workspaceId: string): Promise<Project[]> {
  return query<Project>(
    `select p.id, p.name, p.archived_at,
       (select count(*)::int from tasks t where t.project_id = p.id and t.status <> 'done') as open_tasks
     from projects p where p.workspace_id = $1
     order by p.archived_at is not null, p.created_at`,
    [workspaceId],
  );
}

// Scoped to the workspace, so an id from another workspace finds nothing.
export function projectIn(workspaceId: string, projectId: string): Promise<Project | undefined> {
  return one<Project>(
    `select p.id, p.name, p.archived_at, 0 as open_tasks from projects p where p.workspace_id = $1 and p.id = $2`,
    [workspaceId, projectId],
  );
}

export async function createProject(workspaceId: string, name: string): Promise<string> {
  const row = await one<{ id: string }>("insert into projects (workspace_id, name) values ($1, $2) returning id", [workspaceId, name]);
  return row!.id;
}

export async function archiveProject(workspaceId: string, projectId: string): Promise<void> {
  await query("update projects set archived_at = now() where workspace_id = $1 and id = $2 and archived_at is null", [workspaceId, projectId]);
}
