import { redirect } from "next/navigation";
import { getPasswordSessionAppUser } from "@/lib/auth/password-session";

export const dynamic = "force-dynamic";

const errorMessages: Record<string, string> = {
  invalid: "Incorrect username or password.",
  inactive: "This login has been disabled. Contact the administrator.",
  locked: "Too many failed attempts. Try again after 15 minutes.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const existing = await getPasswordSessionAppUser();
  if (existing) redirect("/admin");

  const params = await searchParams;
  const next =
    params.next?.startsWith("/") && !params.next.startsWith("//")
      ? params.next
      : "/admin";

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: "minmax(0,1.05fr) minmax(360px,.95fr)",
        background: "#f6f8fb",
      }}
    >
      <section
        style={{
          background: "#071c3b",
          color: "white",
          display: "grid",
          alignItems: "center",
          padding: "48px",
        }}
      >
        <div style={{ maxWidth: 620 }}>
          <img
            src="/unique-ads-logo.png"
            alt="Unique Ads"
            style={{
              maxWidth: 210,
              height: "auto",
              marginBottom: 36,
            }}
          />
          <p
            style={{
              textTransform: "uppercase",
              letterSpacing: "0.14em",
              fontSize: 12,
              opacity: 0.72,
              fontWeight: 800,
            }}
          >
            Operations Platform
          </p>
          <h1
            style={{
              fontSize: "clamp(34px,5vw,64px)",
              lineHeight: 1.02,
              margin: "12px 0 18px",
            }}
          >
            Control every campaign from enquiry to collection.
          </h1>
          <p
            style={{
              maxWidth: 540,
              fontSize: 17,
              lineHeight: 1.65,
              opacity: 0.82,
            }}
          >
            Leads, quotations, field work, live geo-tagged photo proof,
            workers, expenses, invoicing and collections in one system.
          </p>
        </div>
      </section>

      <section
        style={{
          display: "grid",
          placeItems: "center",
          padding: "32px",
        }}
      >
        <form
          method="post"
          action="/api/app-auth/login"
          style={{
            width: "min(430px,100%)",
            background: "white",
            padding: 30,
            borderRadius: 18,
            border: "1px solid #dde3ec",
            boxShadow: "0 18px 55px rgba(7,28,59,.10)",
            display: "grid",
            gap: 18,
          }}
        >
          <div>
            <p
              style={{
                color: "#f47b20",
                textTransform: "uppercase",
                letterSpacing: ".12em",
                fontSize: 11,
                fontWeight: 800,
                margin: 0,
              }}
            >
              Team Access
            </p>
            <h2
              style={{
                margin: "7px 0 5px",
                color: "#071c3b",
                fontSize: 28,
              }}
            >
              Sign In
            </h2>
            <p style={{ margin: 0, color: "#667085", fontSize: 14 }}>
              Use the username and password issued by Admin.
            </p>
          </div>

          {params.error ? (
            <div
              style={{
                padding: "11px 13px",
                borderRadius: 10,
                background: "#fff0ee",
                color: "#9d2c20",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {errorMessages[params.error] || "Unable to sign in."}
            </div>
          ) : null}

          <input type="hidden" name="next" value={next} />

          <label style={{ display: "grid", gap: 7 }}>
            <span style={{ fontSize: 13, fontWeight: 800 }}>
              Username
            </span>
            <input
              name="username"
              autoComplete="username"
              required
              style={{
                height: 44,
                border: "1px solid #cfd6e1",
                borderRadius: 10,
                padding: "0 12px",
                fontSize: 15,
              }}
            />
          </label>

          <label style={{ display: "grid", gap: 7 }}>
            <span style={{ fontSize: 13, fontWeight: 800 }}>
              Password
            </span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              style={{
                height: 44,
                border: "1px solid #cfd6e1",
                borderRadius: 10,
                padding: "0 12px",
                fontSize: 15,
              }}
            />
          </label>

          <button
            type="submit"
            style={{
              height: 46,
              border: 0,
              borderRadius: 10,
              background: "#f47b20",
              color: "white",
              fontWeight: 850,
              fontSize: 15,
              cursor: "pointer",
            }}
          >
            Sign In
          </button>

          <p
            style={{
              margin: 0,
              color: "#7a8493",
              fontSize: 12,
              lineHeight: 1.55,
            }}
          >
            Login activity is recorded for operational accountability.
          </p>
        </form>
      </section>
    </main>
  );
}
