import { signIn } from "./actions";

export default async function SignIn(props: PageProps<"/sign-in">) {
  const { next, error } = await props.searchParams;
  return (
    <main className="narrow">
      <h1>Sign in to Plank</h1>
      <form action={signIn} className="stack">
        <input type="hidden" name="next" value={typeof next === "string" ? next : "/"} />
        <label>
          Email
          <input type="email" name="email" autoComplete="email" required autoFocus />
        </label>
        {error === "unknown" && <p className="error">There's no account or invitation for that address.</p>}
        <button type="submit">Sign in</button>
      </form>
      <p className="hint">Demo sign-in: no password. Use an address from the seed data, such as ada@plank.dev.</p>
    </main>
  );
}
