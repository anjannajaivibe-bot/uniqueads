import { redirect } from "next/navigation";
import { neon } from "@neondatabase/serverless";
import { getPasswordSessionAppUser } from "@/lib/auth/password-session";

export const dynamic = "force-dynamic";

const roleLabel: Record<string, string> = {
  super_admin: "Super Admin",
  operations_manager: "Operations Manager",
  supervisor: "Supervisor / Field Team",
  sales: "Sales",
  accounts: "Accounts",
};

export default async function UsersAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const currentUser = await getPasswordSessionAppUser();
  if (!currentUser) redirect("/login");
  if (currentUser.role !== "super_admin") redirect("/unauthorized");

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not configured.");

  const sql = neon(databaseUrl);
  const [users, workers] = await Promise.all([
    sql`
      select
        id,
        username,
        full_name,
        email,
        phone,
        role,
        team_name,
        worker_id,
        is_active,
        last_login_at,
        created_at
      from public.app_users
      order by
        case when role = 'super_admin' then 0 else 1 end,
        full_name
    `,
    sql`
      select id, worker_code, name, skill, is_active
      from public.workers
      where is_active = true
      order by name
    `,
  ]);

  const params = await searchParams;

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div>
        <p style={{ margin: 0, color: "#f47b20", fontWeight: 850 }}>
          Settings
        </p>
        <h1 style={{ margin: "5px 0" }}>Users & Access</h1>
        <p style={{ margin: 0, color: "#667085" }}>
          Create team credentials, assign roles and reset access.
        </p>
      </div>

      {params.success ? (
        <div style={{
          padding: 12,
          borderRadius: 10,
          background: "#ecfdf3",
          color: "#067647",
          fontWeight: 750,
        }}>
          {params.success}
        </div>
      ) : null}

      {params.error ? (
        <div style={{
          padding: 12,
          borderRadius: 10,
          background: "#fff0ee",
          color: "#9d2c20",
          fontWeight: 750,
        }}>
          {params.error}
        </div>
      ) : null}

      <section style={{
        background: "white",
        border: "1px solid #e2e7ef",
        borderRadius: 14,
        padding: 20,
      }}>
        <h2 style={{ marginTop: 0 }}>Create Team Login</h2>

        <form
          method="post"
          action="/api/admin/users/manage"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
            gap: 14,
          }}
        >
          <input type="hidden" name="action" value="create" />

          <label>
            <div>Full Name</div>
            <input name="full_name" required style={{ width: "100%" }} />
          </label>

          <label>
            <div>Username</div>
            <input name="username" required style={{ width: "100%" }} />
          </label>

          <label>
            <div>Password</div>
            <input
              name="password"
              type="password"
              minLength={8}
              required
              style={{ width: "100%" }}
            />
          </label>

          <label>
            <div>Role</div>
            <select name="role" required style={{ width: "100%" }}>
              <option value="operations_manager">Operations Manager</option>
              <option value="supervisor">Supervisor / Field Team</option>
              <option value="sales">Sales</option>
              <option value="accounts">Accounts</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </label>

          <label>
            <div>Team Name</div>
            <input
              name="team_name"
              placeholder="Example: Telangana Field Team"
              style={{ width: "100%" }}
            />
          </label>

          <label>
            <div>Phone</div>
            <input name="phone" style={{ width: "100%" }} />
          </label>

          <label>
            <div>Email, optional</div>
            <input name="email" type="email" style={{ width: "100%" }} />
          </label>

          <label>
            <div>Link to Worker, optional</div>
            <select name="worker_id" style={{ width: "100%" }}>
              <option value="">Not linked</option>
              {workers.map((worker: any) => (
                <option key={worker.id} value={worker.id}>
                  {worker.worker_code
                    ? `${worker.worker_code} - ${worker.name}`
                    : worker.name}
                </option>
              ))}
            </select>
          </label>

          <div style={{ alignSelf: "end" }}>
            <button
              type="submit"
              style={{
                border: 0,
                borderRadius: 9,
                background: "#f47b20",
                color: "white",
                fontWeight: 850,
                padding: "11px 18px",
                cursor: "pointer",
              }}
            >
              Create Login
            </button>
          </div>
        </form>
      </section>

      <section style={{
        background: "white",
        border: "1px solid #e2e7ef",
        borderRadius: 14,
        padding: 20,
        overflowX: "auto",
      }}>
        <h2 style={{ marginTop: 0 }}>Existing Users</h2>

        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            minWidth: 900,
          }}
        >
          <thead>
            <tr>
              {[
                "Name",
                "Username",
                "Role",
                "Team",
                "Status",
                "Last Login",
                "Password",
                "Access",
              ].map((heading) => (
                <th
                  key={heading}
                  style={{
                    textAlign: "left",
                    padding: "10px 8px",
                    borderBottom: "1px solid #e8ebf0",
                  }}
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {users.map((user: any) => (
              <tr key={user.id}>
                <td style={{ padding: 8 }}>{user.full_name}</td>
                <td style={{ padding: 8 }}>
                  <strong>{user.username || "Not set"}</strong>
                </td>
                <td style={{ padding: 8 }}>
                  {roleLabel[user.role] || user.role}
                </td>
                <td style={{ padding: 8 }}>
                  {user.team_name || "-"}
                </td>
                <td style={{ padding: 8 }}>
                  {user.is_active ? "Active" : "Disabled"}
                </td>
                <td style={{ padding: 8 }}>
                  {user.last_login_at
                    ? new Date(user.last_login_at).toLocaleString("en-IN")
                    : "Never"}
                </td>
                <td style={{ padding: 8 }}>
                  <form
                    method="post"
                    action="/api/admin/users/manage"
                    style={{ display: "flex", gap: 6 }}
                  >
                    <input
                      type="hidden"
                      name="action"
                      value="reset_password"
                    />
                    <input
                      type="hidden"
                      name="user_id"
                      value={user.id}
                    />
                    <input
                      name="password"
                      type="password"
                      minLength={8}
                      required
                      placeholder="New password"
                      style={{ width: 140 }}
                    />
                    <button type="submit">Reset</button>
                  </form>
                </td>
                <td style={{ padding: 8 }}>
                  <form method="post" action="/api/admin/users/manage">
                    <input
                      type="hidden"
                      name="action"
                      value="toggle_active"
                    />
                    <input
                      type="hidden"
                      name="user_id"
                      value={user.id}
                    />
                    <button
                      type="submit"
                      disabled={user.id === currentUser.id}
                    >
                      {user.is_active ? "Disable" : "Enable"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <p style={{ margin: 0 }}>
        <a href="/admin/settings">← Back to Settings</a>
      </p>
    </div>
  );
}

