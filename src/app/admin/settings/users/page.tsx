import Link from "next/link";
import { redirect } from "next/navigation";
import { neon } from "@neondatabase/serverless";
import { PageHeader } from "@/components/ui";
import { getPasswordSessionAppUser } from "@/lib/auth/password-session";

export const dynamic = "force-dynamic";

const roleLabel: Record<string, string> = {
  super_admin: "Super Admin",
  operations_manager: "Operations Manager",
  supervisor: "Supervisor / Field Team",
  sales: "Sales",
  accounts: "Accounts",
};

function dateTime(value: any) {
  if (!value) return "Never";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Never";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

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
      select id, worker_code, name, skill
      from public.workers
      where is_active = true
      order by name
    `,
  ]);

  const params = await searchParams;

  return (
    <>
      <PageHeader
        title="Users & Access"
        description="Create team credentials, assign roles, link field workers and control account access."
        action={
          <Link href="/admin/settings" className="button button-secondary">
            Back to Settings
          </Link>
        }
      />

      {params.success ? (
        <div className="form-message form-message-success">{params.success}</div>
      ) : null}

      {params.error ? (
        <div className="form-message form-message-error">{params.error}</div>
      ) : null}

      <section className="form-card users-create-card">
        <div className="form-section-title">
          <div>
            <h2>Create Team Login</h2>
            <p>Every staff member gets an individual username for auditability.</p>
          </div>
        </div>

        <form method="post" action="/api/admin/users/manage">
          <input type="hidden" name="action" value="create" />
          <div className="form-grid">
            <label>
              <span>Full Name *</span>
              <input name="full_name" required />
            </label>
            <label>
              <span>Username *</span>
              <input
                name="username"
                required
                minLength={3}
                maxLength={40}
                autoComplete="off"
              />
            </label>
            <label>
              <span>Initial Password *</span>
              <input
                name="password"
                type="password"
                minLength={8}
                required
                autoComplete="new-password"
              />
            </label>
            <label>
              <span>Role *</span>
              <select name="role" required defaultValue="sales">
                <option value="operations_manager">Operations Manager</option>
                <option value="supervisor">Supervisor / Field Team</option>
                <option value="sales">Sales</option>
                <option value="accounts">Accounts</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </label>
            <label>
              <span>Team Name</span>
              <input name="team_name" placeholder="Example: Telangana Field Team" />
            </label>
            <label>
              <span>Phone</span>
              <input name="phone" inputMode="tel" />
            </label>
            <label>
              <span>Email, optional</span>
              <input name="email" type="email" />
            </label>
            <label>
              <span>Link to Worker, optional</span>
              <select name="worker_id" defaultValue="">
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
          </div>

          <div className="form-actions">
            <button type="submit" className="button button-primary">
              Create Login
            </button>
          </div>
        </form>
      </section>

      <section className="panel users-access-panel">
        <div className="panel-head">
          <div>
            <h2>Existing Users</h2>
            <p>Update role/team links, reset passwords or disable access.</p>
          </div>
          <strong>{users.length} users</strong>
        </div>

        <div className="users-access-list">
          {users.map((user: any) => (
            <article className="user-access-card" key={user.id}>
              <div className="user-access-summary">
                <div>
                  <strong>{user.full_name}</strong>
                  <span>@{user.username || "not-set"}</span>
                </div>
                <span
                  className={`status ${
                    user.is_active ? "status-completed" : "status-cancelled"
                  }`}
                >
                  {user.is_active ? "Active" : "Disabled"}
                </span>
              </div>

              <div className="user-access-meta">
                <span>{roleLabel[user.role] || user.role}</span>
                <span>{user.team_name || "No team"}</span>
                <span>Last login: {dateTime(user.last_login_at)}</span>
              </div>

              <form
                method="post"
                action="/api/admin/users/manage"
                className="user-profile-form"
              >
                <input type="hidden" name="action" value="update_profile" />
                <input type="hidden" name="user_id" value={user.id} />
                <label>
                  <span>Full Name</span>
                  <input name="full_name" defaultValue={user.full_name} required />
                </label>
                <label>
                  <span>Role</span>
                  <select name="role" defaultValue={user.role}>
                    <option value="super_admin">Super Admin</option>
                    <option value="operations_manager">Operations Manager</option>
                    <option value="supervisor">Supervisor / Field Team</option>
                    <option value="sales">Sales</option>
                    <option value="accounts">Accounts</option>
                  </select>
                </label>
                <label>
                  <span>Team</span>
                  <input name="team_name" defaultValue={user.team_name || ""} />
                </label>
                <label>
                  <span>Linked Worker</span>
                  <select name="worker_id" defaultValue={user.worker_id || ""}>
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
                <button type="submit" className="button button-secondary">
                  Save Profile
                </button>
              </form>

              <div className="user-access-actions">
                <form method="post" action="/api/admin/users/manage">
                  <input type="hidden" name="action" value="reset_password" />
                  <input type="hidden" name="user_id" value={user.id} />
                  <input
                    name="password"
                    type="password"
                    minLength={8}
                    required
                    autoComplete="new-password"
                    placeholder="New password"
                  />
                  <button type="submit" className="button button-secondary">
                    Reset Password
                  </button>
                </form>

                <form method="post" action="/api/admin/users/manage">
                  <input type="hidden" name="action" value="toggle_active" />
                  <input type="hidden" name="user_id" value={user.id} />
                  <button
                    type="submit"
                    className="button button-secondary"
                    disabled={user.id === currentUser.id}
                  >
                    {user.is_active ? "Disable Access" : "Enable Access"}
                  </button>
                </form>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
