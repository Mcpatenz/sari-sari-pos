"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en-PH">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "2rem",
          background: "#fff8ee",
          color: "#070c18",
          fontFamily:
            "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <main style={{ maxWidth: "26rem", textAlign: "center" }}>
          <p
            style={{
              margin: 0,
              fontSize: "0.75rem",
              fontWeight: 600,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "#12b76a",
            }}
          >
            TindahanPOS
          </p>
          <h1 style={{ margin: "0.75rem 0 0.5rem", fontSize: "1.75rem" }}>
            Something went wrong
          </h1>
          <p style={{ margin: 0, lineHeight: 1.6, opacity: 0.7 }}>
            The page hit an unexpected error. Your saved sales and inventory are
            safe.
          </p>
          {error.digest ? (
            <p style={{ margin: "0.75rem 0 0", fontSize: "0.75rem", opacity: 0.5 }}>
              Error code: {error.digest}
            </p>
          ) : null}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "1.5rem",
              border: 0,
              borderRadius: "0.95rem",
              padding: "0.8rem 1.4rem",
              background: "#12b76a",
              color: "#fff",
              fontSize: "0.95rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
