import Link from "next/link";
import { workspaceAccess } from "@/lib/access";
import { can } from "@/lib/permissions";
import { projectsIn } from "@/lib/projects";
import { createProjectAction } from "./actions";

export default async function Projects(props: PageProps<"/w/[workspace]">) {
  const { workspace: slug } = await props.params;
  const access = await workspaceAccess(slug);
  const projects = await projectsIn(access.workspace.id);
  const active = projects.filter((project) => !project.archived_at);
  const archived = projects.filter((project) => project.archived_at);

  return (
    <>
      <h1>{access.workspace.name}</h1>
      <ul className="cards">
        {active.map((project) => (
          <li key={project.id}>
            <Link href={`/w/${slug}/projects/${project.id}`}>
              <strong>{project.name}</strong>
              <span>{project.open_tasks === 1 ? "1 open task" : `${project.open_tasks} open tasks`}</span>
            </Link>
          </li>
        ))}
      </ul>
      {can(access.role, "project.create") && (
        <form action={createProjectAction} className="inline">
          <input type="hidden" name="workspace" value={slug} />
          <input name="name" placeholder="New project name" aria-label="New project name" required maxLength={80} />
          <button type="submit">Create project</button>
        </form>
      )}
      {archived.length > 0 && (
        <section>
          <h2>Archived</h2>
          <ul className="plain">
            {archived.map((project) => (
              <li key={project.id}>
                <Link href={`/w/${slug}/projects/${project.id}`}>{project.name}</Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
