# Plank

A small project board for small teams: workspaces, projects, a three-column board, tasks with comments, and invitations.

Plank is a demo application for [ELI5 bot](https://eli5bot.com). Its pull requests are written by coding agents, and ELI5 bot explains them.

## Run it

Needs Node 22.18 or later and PostgreSQL.

```sh
cp .env.example .env    # point DATABASE_URL at an empty database
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Open http://localhost:3000 and sign in as `ada@plank.dev` (owner), `grace@plank.dev` or `linus@plank.dev` (members). Sign-in has no password: it's a placeholder for the demo, not something to deploy.

## How it's put together

- `app/`: Next.js App Router pages. Changes go through server actions in `app/w/[workspace]/actions.ts`.
- `lib/permissions.ts`: what each role can do. `lib/access.ts` resolves the signed-in user's role in a workspace; every page and action starts there.
- `lib/*.ts`: queries, written in SQL with `pg`.
- `migrations/`: SQL files applied in order by `npm run db:migrate`.

`npm test` runs the unit tests, `npm run typecheck` the type checker.

## License

MIT
