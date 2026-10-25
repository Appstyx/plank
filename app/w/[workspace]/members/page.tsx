import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { workspaceAccess } from "@/lib/access";
import { membersOf, ownerCount, pendingInvitations } from "@/lib/members";
import { can, canRemoveMember, type Role } from "@/lib/permissions";
import { projectsIn } from "@/lib/projects";
import { inviteAction, removeMemberAction, revokeInvitationAction } from "../actions";

const roleLabels: Record<Role, string> = { owner: "Owner", member: "Member", guest: "Guest" };

export default async function Members(props: PageProps<"/w/[workspace]/members">) {
  const { workspace: slug } = await props.params;
  const access = await workspaceAccess(slug);
  // Guests don't see who else is in the workspace, or which other projects exist.
  if (!can(access.role, "member.view")) notFound();
  const canInvite = can(access.role, "member.invite");
  const [members, invitations, owners, projects] = await Promise.all([
    membersOf(access.workspace.id),
    canInvite ? pendingInvitations(access.workspace.id) : [],
    ownerCount(access.workspace.id),
    canInvite ? projectsIn(access) : [],
  ]);
  const openProjects = projects.filter((project) => !project.archived_at);
  const host = (await headers()).get("host");
  const origin = `${host?.startsWith("localhost") ? "http" : "https"}://${host}`;

  return (
    <>
      <h1>Members</h1>
      <table>
        <tbody>
          {members.map((member) => (
            <tr key={member.user_id}>
              <td>
                <strong>{member.name}</strong>
                <br />
                <span className="hint">{member.email}</span>
              </td>
              <td>
                {roleLabels[member.role]}
                {member.role === "guest" && (
                  <>
                    <br />
                    <span className="hint">{member.projects.join(", ")}</span>
                  </>
                )}
              </td>
              <td className="actions">
                {canRemoveMember(access.role, member, owners) && (
                  <form action={removeMemberAction}>
                    <input type="hidden" name="workspace" value={slug} />
                    <input type="hidden" name="user" value={member.user_id} />
                    <button type="submit" className="link danger">
                      {member.user_id === access.user.id ? "Leave" : "Remove"}
                    </button>
                  </form>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {canInvite && (
        <section>
          <h2>Invite someone</h2>
          <p className="hint">They'll join as a member and see every project in {access.workspace.name}.</p>
          <form action={inviteAction} className="inline">
            <input type="hidden" name="workspace" value={slug} />
            <input type="email" name="email" placeholder="name@company.com" aria-label="Email" required />
            <button type="submit">Create invitation</button>
          </form>
        </section>
      )}

      {canInvite && openProjects.length > 0 && (
        <section>
          <h2>Invite a guest</h2>
          <p className="hint">Guests see only the projects you pick. They can read tasks and comment, but can't change the board.</p>
          <form action={inviteAction} className="stack guest-form">
            <input type="hidden" name="workspace" value={slug} />
            <input type="hidden" name="role" value="guest" />
            <input type="email" name="email" placeholder="name@client.com" aria-label="Guest email" required />
            <fieldset>
              <legend>Projects</legend>
              {openProjects.map((project) => (
                <label key={project.id}>
                  <input type="checkbox" name="project" value={project.id} /> {project.name}
                </label>
              ))}
            </fieldset>
            <button type="submit">Create guest invitation</button>
          </form>
        </section>
      )}

      {invitations.length > 0 && (
        <section>
          <h2>Waiting to accept</h2>
          <p className="hint">Send each person their link. It works once, for that address.</p>
          <ul className="plain">
            {invitations.map((invitation) => (
              <li key={invitation.id} className="invitation">
                <span>
                  {invitation.email}{" "}
                  <span className="hint">
                    invited by {invitation.invited_by_name}
                    {invitation.role === "guest" && ` as a guest on ${invitation.projects.join(", ")}`}
                  </span>
                </span>
                <input readOnly value={`${origin}/invite/${invitation.token}`} aria-label={`Invitation link for ${invitation.email}`} />
                <form action={revokeInvitationAction}>
                  <input type="hidden" name="workspace" value={slug} />
                  <input type="hidden" name="invitation" value={invitation.id} />
                  <button type="submit" className="link danger">
                    Revoke
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
