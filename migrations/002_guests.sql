alter table memberships
  drop constraint memberships_role_check,
  add constraint memberships_role_check check (role in ('owner', 'member', 'guest'));

-- The projects a guest can see. Rows go with the membership, so a removed guest keeps no access.
create table project_guests (
  workspace_id uuid not null,
  user_id uuid not null,
  project_id uuid not null references projects (id) on delete cascade,
  primary key (project_id, user_id),
  foreign key (workspace_id, user_id) references memberships (workspace_id, user_id) on delete cascade
);

alter table invitations add column role text not null default 'member' check (role in ('member', 'guest'));

create table invitation_projects (
  invitation_id uuid not null references invitations (id) on delete cascade,
  project_id uuid not null references projects (id) on delete cascade,
  primary key (invitation_id, project_id)
);

create index on project_guests (workspace_id, user_id);
