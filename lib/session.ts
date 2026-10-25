// Sessions are random tokens stored in the database and sent as an http-only cookie.
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { one, query } from "./db";

const cookieName = "plank_session";
const sessionDays = 30;

export type User = { id: string; email: string; name: string };

export async function currentUser(): Promise<User | undefined> {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) return undefined;
  return one<User>(
    `select u.id, u.email, u.name from sessions s join users u on u.id = s.user_id
     where s.token = $1 and s.expires_at > now()`,
    [token],
  );
}

export async function requireUser(): Promise<User> {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  return user;
}

export async function startSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  await query("insert into sessions (token, user_id, expires_at) values ($1, $2, now() + make_interval(days => $3))", [token, userId, sessionDays]);
  (await cookies()).set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionDays * 24 * 60 * 60,
  });
}

export async function endSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(cookieName)?.value;
  if (token) await query("delete from sessions where token = $1", [token]);
  jar.delete(cookieName);
}
