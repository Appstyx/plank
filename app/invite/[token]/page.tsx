import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { acceptInvitation, invitationByToken } from "@/lib/members";
import { currentUser } from "@/lib/session";

export default async function Invite(props: PageProps<"/invite/[token]">) {
  const { token } = await props.params;
  const invitation = await invitationByToken(token);
  if (!invitation) notFound();
  if (invitation.accepted_at) redirect(`/w/${invitation.workspace_slug}`);

  const user = await currentUser();
  if (!user) {
    return (
      <main className="narrow">
        <h1>Join {invitation.workspace_name}</h1>
        <p>This invitation is for {invitation.email}.</p>
        <Link className="button" href={`/sign-in?next=${encodeURIComponent(`/invite/${token}`)}`}>
          Sign in to accept
        </Link>
      </main>
    );
  }
  if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
    return (
      <main className="narrow">
        <h1>This invitation is for someone else</h1>
        <p>
          It was sent to {invitation.email}, and you're signed in as {user.email}.
        </p>
      </main>
    );
  }

  async function accept() {
    "use server";
    const signedIn = await currentUser();
    const slug = signedIn && (await acceptInvitation(token, signedIn));
    redirect(slug ? `/w/${slug}` : "/");
  }

  return (
    <main className="narrow">
      <h1>Join {invitation.workspace_name}</h1>
      {invitation.role === "guest" ? (
        <p>You'll be able to read and comment on tasks in {invitation.projects.join(", ")}.</p>
      ) : (
        <p>You'll be able to see and work on every project in the workspace.</p>
      )}
      <form action={accept}>
        <button type="submit">Accept invitation</button>
      </form>
    </main>
  );
}
