import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { workspacesOf } from "@/lib/workspaces";

export default async function Home() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  const [first] = await workspacesOf(user.id);
  if (first) redirect(`/w/${first.slug}`);
  return (
    <main className="narrow">
      <h1>No workspaces yet</h1>
      <p>Ask a workspace owner for an invitation link.</p>
    </main>
  );
}
