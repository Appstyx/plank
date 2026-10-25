import { describe, expect, test } from "vitest";
import { can, canRemoveMember } from "../lib/permissions";

describe("roles", () => {
  test("members work on projects and tasks but don't manage people", () => {
    expect(can("member", "task.edit")).toBe(true);
    expect(can("member", "project.create")).toBe(true);
    expect(can("member", "project.archive")).toBe(false);
    expect(can("member", "member.invite")).toBe(false);
    expect(can("member", "member.remove")).toBe(false);
  });

  test("owners can do everything", () => {
    for (const action of ["project.archive", "member.invite", "member.remove", "task.comment"] as const) {
      expect(can("owner", action)).toBe(true);
    }
  });

  test("guests comment but don't change the board or see the member list", () => {
    expect(can("guest", "task.comment")).toBe(true);
    for (const action of ["project.create", "project.archive", "task.create", "task.edit", "member.view", "member.invite", "member.remove"] as const) {
      expect(can("guest", action)).toBe(false);
    }
  });
});

describe("removing members", () => {
  test("an owner can remove members and other owners", () => {
    expect(canRemoveMember("owner", { role: "member" }, 1)).toBe(true);
    expect(canRemoveMember("owner", { role: "owner" }, 2)).toBe(true);
    expect(canRemoveMember("owner", { role: "guest" }, 1)).toBe(true);
  });

  test("the last owner can't be removed, not even by themselves", () => {
    expect(canRemoveMember("owner", { role: "owner" }, 1)).toBe(false);
  });

  test("members and guests can't remove anyone", () => {
    expect(canRemoveMember("member", { role: "member" }, 1)).toBe(false);
    expect(canRemoveMember("member", { role: "guest" }, 1)).toBe(false);
    expect(canRemoveMember("guest", { role: "guest" }, 1)).toBe(false);
  });
});
