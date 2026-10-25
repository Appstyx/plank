"use client";

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="narrow">
      <h1>That didn't work</h1>
      {/* In production React replaces server error messages with a generic one. */}
      <p>{error.message}</p>
      <button type="button" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
