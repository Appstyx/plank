// What each workspace role may do. Pages hide what a role can't do; server actions enforce it with authorize().
export type Role = "owner" | "member";

export type Action =
  | "project.create"
  | "project.archive"
  | "task.create"
  | "task.edit"
  | "task.comment"
  | "member.invite"
  | "member.remove";

const allowed: Record<Role, ReadonlySet<Action>> = {
  owner: new Set<Action>(["project.create", "project.archive", "task.create", "task.edit", "task.comment", "member.invite", "member.remove"]),
  member: new Set<Action>(["project.create", "task.create", "task.edit", "task.comment"]),
};

export function can(role: Role, action: Action): boolean {
  return allowed[role].has(action);
}

// A workspace always keeps at least one owner, so nobody can remove the last one, themselves included.
export function canRemoveMember(actor: Role, target: { role: Role }, owners: number): boolean {
  return can(actor, "member.remove") && !(target.role === "owner" && owners <= 1);
}
