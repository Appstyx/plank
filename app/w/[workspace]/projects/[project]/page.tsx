import Link from "next/link";
import { notFound } from "next/navigation";
import { workspaceAccess } from "@/lib/access";
import { can } from "@/lib/permissions";
import { projectIn } from "@/lib/projects";
import { statusLabels, statuses, tasksIn } from "@/lib/tasks";
import { archiveProjectAction, createTaskAction, moveTaskAction } from "../../actions";

export default async function Board(props: PageProps<"/w/[workspace]/projects/[project]">) {
  const { workspace: slug, project: projectId } = await props.params;
  const access = await workspaceAccess(slug);
  const project = await projectIn(access, projectId);
  if (!project) notFound();
  const tasks = await tasksIn(project.id);
  const canEdit = can(access.role, "task.edit") && !project.archived_at;

  return (
    <>
      <div className="title-row">
        <h1>{project.name}</h1>
        {project.archived_at ? (
          <span className="badge">Archived</span>
        ) : (
          can(access.role, "project.archive") && (
            <form action={archiveProjectAction}>
              <input type="hidden" name="workspace" value={slug} />
              <input type="hidden" name="project" value={project.id} />
              <button type="submit" className="secondary">
                Archive project
              </button>
            </form>
          )
        )}
      </div>

      <div className="board">
        {statuses.map((status, column) => (
          <section key={status} className="column">
            <h2>{statusLabels[status]}</h2>
            <ul>
              {tasks
                .filter((task) => task.status === status)
                .map((task) => (
                  <li key={task.id} className="task">
                    <Link href={`/w/${slug}/tasks/${task.id}`}>
                      <span className="number">#{task.number}</span> {task.title}
                    </Link>
                    <div className="meta">
                      <span>{task.assignee_name ?? "Unassigned"}</span>
                      {task.comment_count > 0 && <span>{task.comment_count} comments</span>}
                    </div>
                    {canEdit && (
                      <div className="moves">
                        {[statuses[column - 1], statuses[column + 1]].map(
                          (target, index) =>
                            target && (
                              <form key={target} action={moveTaskAction}>
                                <input type="hidden" name="workspace" value={slug} />
                                <input type="hidden" name="task" value={task.id} />
                                <input type="hidden" name="status" value={target} />
                                <button type="submit" className="link" aria-label={`Move to ${statusLabels[target]}`}>
                                  {index === 0 ? `← ${statusLabels[target]}` : `${statusLabels[target]} →`}
                                </button>
                              </form>
                            ),
                        )}
                      </div>
                    )}
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </div>

      {can(access.role, "task.create") && !project.archived_at && (
        <form action={createTaskAction} className="inline">
          <input type="hidden" name="workspace" value={slug} />
          <input type="hidden" name="project" value={project.id} />
          <input name="title" placeholder="New task" aria-label="New task" required maxLength={160} />
          <button type="submit">Add task</button>
        </form>
      )}
    </>
  );
}
