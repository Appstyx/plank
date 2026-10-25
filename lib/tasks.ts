import type { Access } from "./access";
import { one, query, transaction } from "./db";
import { scope, visibleProject } from "./projects";

export const statuses = ["todo", "doing", "done"] as const;
export type Status = (typeof statuses)[number];
export const statusLabels: Record<Status, string> = { todo: "To do", doing: "In progress", done: "Done" };

export type Task = {
  id: string;
  project_id: string;
  number: number;
  title: string;
  description: string;
  status: Status;
  assignee_id: string | null;
  assignee_name: string | null;
  comment_count: number;
};

export type Comment = { id: string; body: string; author_name: string; created_at: Date };

const taskColumns = `t.id, t.project_id, t.number, t.title, t.description, t.status, t.assignee_id, a.name as assignee_name,
  (select count(*)::int from comments c where c.task_id = t.id) as comment_count`;

export function tasksIn(projectId: string): Promise<Task[]> {
  return query<Task>(
    `select ${taskColumns} from tasks t left join users a on a.id = t.assignee_id
     where t.project_id = $1 order by t.number`,
    [projectId],
  );
}

export function taskIn(access: Access, taskId: string): Promise<(Task & { project_name: string }) | undefined> {
  return one(
    `select ${taskColumns}, p.name as project_name from tasks t
     join projects p on p.id = t.project_id
     left join users a on a.id = t.assignee_id
     where ${visibleProject} and t.id = $3`,
    [...scope(access), taskId],
  );
}

// Task numbers count up per project; the project row is locked so two new tasks can't take the same number.
export function createTask(projectId: string, createdBy: string, title: string): Promise<string> {
  return transaction(async (client) => {
    await client.query("select 1 from projects where id = $1 for update", [projectId]);
    const { rows } = await client.query<{ id: string }>(
      `insert into tasks (project_id, number, title, created_by)
       values ($1, (select coalesce(max(number), 0) + 1 from tasks where project_id = $1), $2, $3)
       returning id`,
      [projectId, title, createdBy],
    );
    return rows[0].id;
  });
}

export async function updateTask(taskId: string, fields: { title: string; description: string; status: Status; assigneeId: string | null }): Promise<void> {
  await query(
    "update tasks set title = $2, description = $3, status = $4, assignee_id = $5, updated_at = now() where id = $1",
    [taskId, fields.title, fields.description, fields.status, fields.assigneeId],
  );
}

export async function moveTask(taskId: string, status: Status): Promise<void> {
  await query("update tasks set status = $2, updated_at = now() where id = $1", [taskId, status]);
}

export function commentsOn(taskId: string): Promise<Comment[]> {
  return query<Comment>(
    `select c.id, c.body, u.name as author_name, c.created_at from comments c
     join users u on u.id = c.author_id where c.task_id = $1 order by c.created_at`,
    [taskId],
  );
}

export async function addComment(taskId: string, authorId: string, body: string): Promise<void> {
  await query("insert into comments (task_id, author_id, body) values ($1, $2, $3)", [taskId, authorId, body]);
}
