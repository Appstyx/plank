import Link from "next/link";
import { notFound } from "next/navigation";
import { workspaceAccess } from "@/lib/access";
import { membersOf } from "@/lib/members";
import { can } from "@/lib/permissions";
import { commentsOn, statusLabels, statuses, taskIn } from "@/lib/tasks";
import { addCommentAction, updateTaskAction } from "../../actions";

export default async function TaskPage(props: PageProps<"/w/[workspace]/tasks/[task]">) {
  const { workspace: slug, task: taskId } = await props.params;
  const access = await workspaceAccess(slug);
  const task = await taskIn(access, taskId);
  if (!task) notFound();
  const [comments, members] = await Promise.all([commentsOn(task.id), membersOf(access.workspace.id)]);
  const canEdit = can(access.role, "task.edit");
  const assignees = members.filter((member) => can(member.role, "task.edit"));

  return (
    <>
      <p className="crumbs">
        <Link href={`/w/${slug}/projects/${task.project_id}`}>{task.project_name}</Link> / #{task.number}
      </p>
      {canEdit ? (
        <form action={updateTaskAction} className="stack task-form">
          <input type="hidden" name="workspace" value={slug} />
          <input type="hidden" name="task" value={task.id} />
          <input name="title" defaultValue={task.title} aria-label="Title" className="title-input" required maxLength={160} />
          <div className="fields">
            <label>
              Status
              <select name="status" defaultValue={task.status}>
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {statusLabels[status]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Assignee
              <select name="assignee" defaultValue={task.assignee_id ?? ""}>
                <option value="">Unassigned</option>
                {assignees.map((member) => (
                  <option key={member.user_id} value={member.user_id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label>
            Description
            <textarea name="description" defaultValue={task.description} rows={6} maxLength={5000} />
          </label>
          <button type="submit">Save</button>
        </form>
      ) : (
        <>
          <h1>{task.title}</h1>
          <p>
            {statusLabels[task.status]} · {task.assignee_name ?? "Unassigned"}
          </p>
          <p className="description">{task.description}</p>
        </>
      )}

      <section className="comments">
        <h2>Comments</h2>
        <ul className="plain">
          {comments.map((comment) => (
            <li key={comment.id}>
              <p className="meta">
                <strong>{comment.author_name}</strong> · {comment.created_at.toLocaleDateString("en", { day: "numeric", month: "short" })}
              </p>
              <p className="description">{comment.body}</p>
            </li>
          ))}
        </ul>
        {can(access.role, "task.comment") && (
          <form action={addCommentAction} className="stack">
            <input type="hidden" name="workspace" value={slug} />
            <input type="hidden" name="task" value={task.id} />
            <textarea name="body" rows={3} aria-label="Comment" required maxLength={5000} />
            <button type="submit">Comment</button>
          </form>
        )}
      </section>
    </>
  );
}
