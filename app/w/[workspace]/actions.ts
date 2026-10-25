"use server";

// Every action re-checks access from the slug in the form: hidden inputs are user input like any other.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { authorize, workspaceAccess } from "@/lib/access";
import { email, text } from "@/lib/forms";
import { invite, membersOf, ownerCount, removeMember, revokeInvitation } from "@/lib/members";
import { canRemoveMember } from "@/lib/permissions";
import { archiveProject, createProject, projectIn } from "@/lib/projects";
import { addComment, createTask, moveTask, statuses, taskIn, updateTask, type Status } from "@/lib/tasks";

function status(form: FormData): Status {
  const value = String(form.get("status"));
  if (!(statuses as readonly string[]).includes(value)) throw new Error("Unknown status.");
  return value as Status;
}

export async function createProjectAction(form: FormData) {
  const access = await workspaceAccess(text(form, "workspace"));
  authorize(access, "project.create");
  const id = await createProject(access.workspace.id, text(form, "name", { max: 80 }));
  redirect(`/w/${access.workspace.slug}/projects/${id}`);
}

export async function archiveProjectAction(form: FormData) {
  const access = await workspaceAccess(text(form, "workspace"));
  authorize(access, "project.archive");
  await archiveProject(access.workspace.id, text(form, "project"));
  redirect(`/w/${access.workspace.slug}`);
}

export async function createTaskAction(form: FormData) {
  const access = await workspaceAccess(text(form, "workspace"));
  authorize(access, "task.create");
  const project = await projectIn(access.workspace.id, text(form, "project"));
  if (!project || project.archived_at) throw new Error("That project doesn't take new tasks.");
  await createTask(project.id, access.user.id, text(form, "title", { max: 160 }));
  revalidatePath(`/w/${access.workspace.slug}/projects/${project.id}`);
}

export async function moveTaskAction(form: FormData) {
  const access = await workspaceAccess(text(form, "workspace"));
  authorize(access, "task.edit");
  const task = await taskIn(access.workspace.id, text(form, "task"));
  if (!task) throw new Error("Task not found.");
  await moveTask(task.id, status(form));
  revalidatePath(`/w/${access.workspace.slug}/projects/${task.project_id}`);
}

export async function updateTaskAction(form: FormData) {
  const access = await workspaceAccess(text(form, "workspace"));
  authorize(access, "task.edit");
  const task = await taskIn(access.workspace.id, text(form, "task"));
  if (!task) throw new Error("Task not found.");
  const assigneeId = text(form, "assignee", { optional: true }) || null;
  // Tasks can only be assigned to people in the workspace.
  if (assigneeId && !(await membersOf(access.workspace.id)).some((member) => member.user_id === assigneeId)) {
    throw new Error("That person isn't in this workspace.");
  }
  await updateTask(task.id, {
    title: text(form, "title", { max: 160 }),
    description: text(form, "description", { max: 5000, optional: true }),
    status: status(form),
    assigneeId,
  });
  revalidatePath(`/w/${access.workspace.slug}/tasks/${task.id}`);
}

export async function addCommentAction(form: FormData) {
  const access = await workspaceAccess(text(form, "workspace"));
  authorize(access, "task.comment");
  const task = await taskIn(access.workspace.id, text(form, "task"));
  if (!task) throw new Error("Task not found.");
  await addComment(task.id, access.user.id, text(form, "body", { max: 5000 }));
  revalidatePath(`/w/${access.workspace.slug}/tasks/${task.id}`);
}

export async function inviteAction(form: FormData) {
  const access = await workspaceAccess(text(form, "workspace"));
  authorize(access, "member.invite");
  const address = email(form);
  if ((await membersOf(access.workspace.id)).some((member) => member.email.toLowerCase() === address)) {
    throw new Error(`${address} is already in this workspace.`);
  }
  await invite(access.workspace.id, address, access.user.id);
  revalidatePath(`/w/${access.workspace.slug}/members`);
}

export async function revokeInvitationAction(form: FormData) {
  const access = await workspaceAccess(text(form, "workspace"));
  authorize(access, "member.invite");
  await revokeInvitation(access.workspace.id, text(form, "invitation"));
  revalidatePath(`/w/${access.workspace.slug}/members`);
}

export async function removeMemberAction(form: FormData) {
  const access = await workspaceAccess(text(form, "workspace"));
  const target = (await membersOf(access.workspace.id)).find((member) => member.user_id === text(form, "user"));
  if (!target) throw new Error("That person isn't in this workspace.");
  if (!canRemoveMember(access.role, target, await ownerCount(access.workspace.id))) {
    throw new Error("You can't remove that member.");
  }
  await removeMember(access.workspace.id, target.user_id);
  if (target.user_id === access.user.id) redirect("/");
  revalidatePath(`/w/${access.workspace.slug}/members`);
}
