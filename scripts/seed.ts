// Fills an empty database with one workspace, three people and two projects. Refuses to run twice.
import pg from "pg";

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
if ((await client.query("select 1 from workspaces limit 1")).rowCount) {
  console.log("The database already has data; not seeding.");
  await client.end();
  process.exit(0);
}

const id = async (sql: string, values: unknown[]) => (await client.query<{ id: string }>(`${sql} returning id`, values)).rows[0].id;

await client.query("begin");
const ada = await id("insert into users (email, name) values ($1, $2)", ["ada@plank.dev", "Ada Lovelace"]);
const grace = await id("insert into users (email, name) values ($1, $2)", ["grace@plank.dev", "Grace Hopper"]);
const linus = await id("insert into users (email, name) values ($1, $2)", ["linus@plank.dev", "Linus Pauling"]);

const acme = await id("insert into workspaces (name, slug) values ($1, $2)", ["Acme", "acme"]);
for (const [user, role] of [[ada, "owner"], [grace, "member"], [linus, "member"]]) {
  await client.query("insert into memberships (workspace_id, user_id, role) values ($1, $2, $3)", [acme, user, role]);
}
await client.query("insert into invitations (workspace_id, email, token, invited_by) values ($1, $2, $3, $4)", [
  acme,
  "margaret@plank.dev",
  "demo-invitation-margaret",
  ada,
]);

const projects: [string, [string, string, string | null][]][] = [
  [
    "Website relaunch",
    [
      ["Write the new pricing page", "doing", grace],
      ["Pick the hero illustration", "todo", null],
      ["Move the blog to the new domain", "todo", linus],
      ["Set up redirects from old URLs", "done", linus],
      ["Draft the launch announcement", "todo", ada],
    ],
  ],
  [
    "Mobile app",
    [
      ["Fix login on Android 15", "doing", linus],
      ["Offline mode for the task list", "todo", null],
      ["Push notifications for mentions", "todo", grace],
      ["Ship 2.3 to the App Store", "done", ada],
    ],
  ],
];
for (const [name, tasks] of projects) {
  const project = await id("insert into projects (workspace_id, name) values ($1, $2)", [acme, name]);
  for (const [index, [title, status, assignee]] of tasks.entries()) {
    const task = await id(
      "insert into tasks (project_id, number, title, status, assignee_id, created_by) values ($1, $2, $3, $4, $5, $6)",
      [project, index + 1, title, status, assignee, ada],
    );
    if (index === 0) {
      await client.query("insert into comments (task_id, author_id, body) values ($1, $2, $3)", [task, ada, "Can we get a first draft by Thursday?"]);
      await client.query("insert into comments (task_id, author_id, body) values ($1, $2, $3)", [task, grace, "Yes, I'll share it in the morning."]);
    }
  }
}
await client.query("commit");
console.log("Seeded: sign in as ada@plank.dev (owner), grace@plank.dev or linus@plank.dev (members).");
await client.end();
