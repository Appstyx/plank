// Reads a required text field from a submitted form, trimmed and capped, or throws a message the page can show.
export function text(form: FormData, name: string, { max = 200, optional = false } = {}): string {
  const value = String(form.get(name) ?? "").trim();
  if (!value && !optional) throw new Error(`${name} is required.`);
  if (value.length > max) throw new Error(`${name} is longer than ${max} characters.`);
  return value;
}

export function email(form: FormData, name = "email"): string {
  const value = text(form, name, { max: 254 }).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new Error("That doesn't look like an email address.");
  return value;
}
