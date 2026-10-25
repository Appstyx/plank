import { expect, test } from "vitest";
import { email, text } from "../lib/forms";

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
};

test("text fields are trimmed, required unless optional, and capped", () => {
  expect(text(form({ name: "  Launch  " }), "name")).toBe("Launch");
  expect(() => text(form({ name: "   " }), "name")).toThrow("name is required.");
  expect(text(form({}), "description", { optional: true })).toBe("");
  expect(() => text(form({ name: "x".repeat(81) }), "name", { max: 80 })).toThrow("longer than 80");
});

test("email addresses are lowercased and must look like one", () => {
  expect(email(form({ email: "Ada@Plank.dev " }))).toBe("ada@plank.dev");
  expect(() => email(form({ email: "ada" }))).toThrow("doesn't look like an email");
});
