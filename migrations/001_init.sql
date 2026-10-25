create table users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

create table sessions (
  token text primary key,
  user_id uuid not null references users (id) on delete cascade,
  expires_at timestamptz not null
);

create table workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table memberships (
  workspace_id uuid not null references workspaces (id) on delete cascade,
  user_id uuid not null references users (id) on delete cascade,
  role text not null check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  email text not null,
  token text not null unique,
  invited_by uuid not null references users (id),
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

create table projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  number integer not null,
  title text not null,
  description text not null default '',
  status text not null default 'todo' check (status in ('todo', 'doing', 'done')),
  assignee_id uuid references users (id) on delete set null,
  created_by uuid not null references users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, number)
);

create table comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks (id) on delete cascade,
  author_id uuid not null references users (id),
  body text not null,
  created_at timestamptz not null default now()
);

create index on memberships (user_id);
create index on invitations (workspace_id) where accepted_at is null;
create index on projects (workspace_id);
create index on tasks (project_id, status);
create index on comments (task_id, created_at);
