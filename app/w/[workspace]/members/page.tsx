import { headers } from "next/headers";
import { workspaceAccess } from "@/lib/access";
import { membersOf, ownerCount, pendingInvitations } from "@/lib/members";
import { can, canRemoveMember } from "@/lib/permissions";
import { inviteAction, removeMemberAction, revokeInvitationAction } from "../actions";

export default async function Members(props: PageProps<"/w/[workspace]/members">) {
  const { workspace: slug } = await props.params;
  const access = await workspaceAccess(slug);
  const [members, invitations, owners] = await Promise.all([
    membersOf(access.workspace.id),
    can(access.role, "member.invite") ? pendingInvitations(access.workspace.id) : [],
    ownerCount(access.workspace.id),
  ]);
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
              <td>{member.role === "owner" ? "Owner" : "Member"}</td>
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

      {can(access.role, "member.invite") && (
        <section>
          <h2>Invite someone</h2>
          <p className="hint">They'll join as a member and see every project in {access.workspace.name}.</p>
          <form action={inviteAction} className="inline">
            <input type="hidden" name="workspace" value={slug} />
            <input type="email" name="email" placeholder="name@company.com" aria-label="Email" required />
            <button type="submit">Create invitation</button>
          </form>
          {invitations.length > 0 && (
            <>
              <h3>Waiting to accept</h3>
              <p className="hint">Send each person their link. It works once, for that address.</p>
              <ul className="plain">
                {invitations.map((invitation) => (
                  <li key={invitation.id} className="invitation">
                    <span>
                      {invitation.email} <span className="hint">invited by {invitation.invited_by_name}</span>
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
            </>
          )}
        </section>
      )}
    </>
  );
}
