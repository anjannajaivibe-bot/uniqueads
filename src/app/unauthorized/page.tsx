export default function UnauthorizedPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "#f6f8fb",
      }}
    >
      <section
        style={{
          width: "min(520px,100%)",
          background: "white",
          border: "1px solid #e1e6ee",
          borderRadius: 16,
          padding: 28,
          boxShadow: "0 16px 45px rgba(7,28,59,.08)",
        }}
      >
        <p
          style={{
            margin: 0,
            color: "#f47b20",
            fontWeight: 850,
            textTransform: "uppercase",
            letterSpacing: ".12em",
            fontSize: 11,
          }}
        >
          Unique Ads
        </p>

        <h1
          style={{
            margin: "8px 0 10px",
            color: "#071c3b",
            fontSize: 30,
          }}
        >
          Access Restricted
        </h1>

        <p
          style={{
            margin: 0,
            color: "#667085",
            lineHeight: 1.6,
          }}
        >
          Your login is valid, but your assigned role does not have
          permission to open this section.
        </p>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            marginTop: 22,
          }}
        >
          <a
            href="/admin"
            style={{
              textDecoration: "none",
              background: "#f47b20",
              color: "white",
              fontWeight: 800,
              borderRadius: 9,
              padding: "10px 16px",
            }}
          >
            Go to Dashboard
          </a>

          <a
            href="/api/app-auth/logout"
            style={{
              textDecoration: "none",
              background: "#071c3b",
              color: "white",
              fontWeight: 800,
              borderRadius: 9,
              padding: "10px 16px",
            }}
          >
            Sign Out
          </a>
        </div>
      </section>
    </main>
  );
}
