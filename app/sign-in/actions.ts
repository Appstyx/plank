"use server";

import { redirect } from "next/navigation";
import { one } from "@/lib/db";
import { email } from "@/lib/forms";
import { endSession, startSession } from "@/lib/session";

// ponytail: passwordless placeholder sign-in for the demo; swap in a real identity provider before deploying anywhere.
export async function signIn(form: FormData) {
  const address = email(form);
  const next = String(form.get("next") ?? "/");
  let user = await one<{ id: string }>("select id from users where lower(email) = $1", [address]);
  // Someone with an open invitation gets an account on first sign-in, named after their address until they change it.
  if (!user) {
    const invited = await one("select 1 from invitations where lower(email) = $1 and accepted_at is null", [address]);
    if (!invited) redirect(`/sign-in?error=unknown&next=${encodeURIComponent(next)}`);
    user = await one<{ id: string }>("insert into users (email, name) values ($1, $2) returning id", [address, address.split("@")[0]]);
  }
  await startSession(user!.id);
  // Only same-site paths, so the sign-in form can't be used to bounce people to another site.
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

export async function signOut() {
  await endSession();
  redirect("/sign-in");
}
