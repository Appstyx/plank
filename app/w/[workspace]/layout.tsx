import Link from "next/link";
import { workspaceAccess } from "@/lib/access";
import { workspacesOf } from "@/lib/workspaces";
import { signOut } from "../../sign-in/actions";

export default async function WorkspaceLayout(props: LayoutProps<"/w/[workspace]">) {
  const { workspace: slug } = await props.params;
  const { user, workspace } = await workspaceAccess(slug);
  const workspaces = await workspacesOf(user.id);
  return (
    <div className="shell">
      <header className="topbar">
        <Link href={`/w/${workspace.slug}`} className="brand">
          Plank
        </Link>
        <nav>
          {workspaces.length > 1 &&
            workspaces.map((other) => (
              <Link key={other.id} href={`/w/${other.slug}`} aria-current={other.id === workspace.id ? "page" : undefined}>
                {other.name}
              </Link>
            ))}
          <Link href={`/w/${workspace.slug}/members`}>Members</Link>
        </nav>
        <form action={signOut} className="account">
          <span>{user.name}</span>
          <button type="submit" className="link">
            Sign out
          </button>
        </form>
      </header>
      <main>{props.children}</main>
    </div>
  );
}
