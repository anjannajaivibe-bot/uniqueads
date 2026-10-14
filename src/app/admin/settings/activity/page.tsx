import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

function dateTime(value: any) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function label(value: string | null | undefined) {
  return String(value ?? "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default async function ActivityAuditPage() {
  const [activity, logins] = await Promise.all([
    sql`
      SELECT
        a.id,
        a.action,
        a.entity_type,
        a.description,
        a.created_at,
        u.full_name AS actor_name,
        u.username AS actor_username
      FROM activity_logs a
      LEFT JOIN app_users u ON u.id = a.actor_user_id
      ORDER BY a.created_at DESC
      LIMIT 300
    `,
    sql`
      SELECT
        id,
        username,
        success,
        ip_address,
        failure_reason,
        created_at
      FROM app_login_audit
      ORDER BY created_at DESC
      LIMIT 200
    `,
  ]);

  return (
    <>
      <PageHeader
        title="Activity & Login Audit"
        description="Recent operational changes and authentication events for accountability."
        action={
          <Link href="/admin/settings" className="button button-secondary">
            Back to Settings
          </Link>
        }
      />

      <section className="panel audit-section">
        <div className="panel-head">
          <div>
            <h2>Operational Activity</h2>
            <p>Latest changes recorded across leads, customers, orders, finance and users.</p>
          </div>
          <strong>{activity.length} recent</strong>
        </div>
        <div className="table-wrap audit-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>User</th>
                <th>Area</th>
                <th>Action</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {activity.length === 0 ? (
                <tr>
                  <td colSpan={5} className="empty-cell">No activity recorded yet.</td>
                </tr>
              ) : (
                activity.map((row: any) => (
                  <tr key={row.id}>
                    <td>{dateTime(row.created_at)}</td>
                    <td>
                      <strong>{row.actor_name || "System"}</strong>
                      {row.actor_username ? (
                        <div className="table-subtext">@{row.actor_username}</div>
                      ) : null}
                    </td>
                    <td>{label(row.entity_type)}</td>
                    <td>{label(row.action)}</td>
                    <td>{row.description || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel audit-section">
        <div className="panel-head">
          <div>
            <h2>Login Audit</h2>
            <p>Successful and failed sign-in attempts, including lockout reasons.</p>
          </div>
          <strong>{logins.length} recent</strong>
        </div>
        <div className="table-wrap audit-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Username</th>
                <th>Result</th>
                <th>Reason</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {logins.length === 0 ? (
                <tr>
                  <td colSpan={5} className="empty-cell">No login activity recorded yet.</td>
                </tr>
              ) : (
                logins.map((row: any) => (
                  <tr key={row.id}>
                    <td>{dateTime(row.created_at)}</td>
                    <td className="mono">{row.username || "-"}</td>
                    <td>
                      <span
                        className={`status ${
                          row.success ? "status-completed" : "status-cancelled"
                        }`}
                      >
                        {row.success ? "Success" : "Failed"}
                      </span>
                    </td>
                    <td>{row.failure_reason ? label(row.failure_reason) : "-"}</td>
                    <td className="mono">{row.ip_address || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
