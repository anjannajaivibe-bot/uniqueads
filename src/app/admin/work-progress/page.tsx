import Link from "next/link";
import { PageHeader, StatCard } from "@/components/ui";
import { requireAppUser } from "@/lib/auth/authorization";
import {
  getWorkProgressCounts,
  getWorkProgressOverview,
} from "@/lib/work-progress-queries";

export const dynamic = "force-dynamic";

function label(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function date(value: any) {
  if (!value) return "Not set";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Not set";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export default async function WorkProgressPage() {
  const currentUser = await requireAppUser();
  const [rows, counts] = await Promise.all([
    getWorkProgressOverview(currentUser),
    getWorkProgressCounts(currentUser),
  ]);

  const groups = new Map<string, any>();

  for (const row of rows as any[]) {
    if (!groups.has(row.order_id)) {
      groups.set(row.order_id, {
        order_id: row.order_id,
        order_no: row.order_no,
        campaign_name: row.campaign_name,
        company_name: row.company_name,
        due_date: row.due_date,
        order_status: row.order_status,
        locations: [],
      });
    }
    groups.get(row.order_id).locations.push(row);
  }

  return (
    <>
      <PageHeader
        title="Work Progress"
        description={currentUser.role === "supervisor" ? "Your assigned locations with progress, live photo proof, GPS and quality checks." : "Field execution control with location-wise progress, site proof photos, GPS and quality checks."}
      />

      <div className="lead-stats">
        <StatCard label="Waiting / Assigned" value={Number((counts as any).waiting_count || 0)} />
        <StatCard label="In Progress" value={Number((counts as any).in_progress_count || 0)} />
        <StatCard label="Quality Check" value={Number((counts as any).quality_count || 0)} />
        <StatCard
          label="Overall Progress"
          value={`${Number((counts as any).average_progress || 0)}%`}
          note={`${Number((counts as any).blocked_count || 0)} blocked`}
        />
      </div>

      <div className="work-order-board">
        {groups.size === 0 ? (
          <section className="panel">
            <div className="empty-state">
              No execution locations yet. Create an Order and add campaign locations first.
            </div>
          </section>
        ) : (
          Array.from(groups.values()).map((group: any) => {
            const total = group.locations.length;
            const completed = group.locations.filter(
              (location: any) => location.status === "completed"
            ).length;
            const average =
              total === 0
                ? 0
                : Math.round(
                    group.locations.reduce(
                      (sum: number, location: any) =>
                        sum + Number(location.progress_percent || 0),
                      0
                    ) / total
                  );

            return (
              <section className="panel work-order-group" key={group.order_id}>
                <div className="work-order-head">
                  <div>
                    <Link href={`/admin/orders/${group.order_id}`} className="mono">
                      {group.order_no}
                    </Link>
                    <h2>{group.campaign_name}</h2>
                    <p>{group.company_name} · Due {date(group.due_date)}</p>
                  </div>
                  <div className="work-order-progress">
                    <strong>{average}%</strong>
                    <div className="order-progress-track">
                      <span style={{ width: `${Math.max(0, Math.min(100, average))}%` }} />
                    </div>
                    <small>{completed} of {total} locations complete</small>
                  </div>
                </div>

                <div className="work-location-board">
                  {group.locations.map((location: any) => (
                    <Link
                      href={`/admin/work-progress/${location.id}`}
                      className={`work-location-tile work-location-${location.status}`}
                      key={location.id}
                    >
                      <div className="work-location-tile-head">
                        <div>
                          <strong>{location.location_name}</strong>
                          <span>
                            {[location.city, location.district, location.state]
                              .filter(Boolean)
                              .join(" · ") || "Location details not set"}
                          </span>
                        </div>
                        <span className={`status status-${location.status}`}>
                          {label(location.status)}
                        </span>
                      </div>

                      <div className="work-tile-progress">
                        <div className="order-progress-track">
                          <span
                            style={{
                              width: `${Math.max(
                                0,
                                Math.min(100, Number(location.progress_percent || 0))
                              )}%`,
                            }}
                          />
                        </div>
                        <strong>{Number(location.progress_percent || 0)}%</strong>
                      </div>

                      <div className="work-photo-counts">
                        <span>Before {location.before_count}</span>
                        <span>During {location.during_count}</span>
                        <span>Completed {location.completed_photo_count}</span>
                      </div>

                      <p className="work-latest-note">
                        {location.latest_update_text ||
                          (location.photo_count > 0
                            ? `${location.photo_count} site photo${location.photo_count === 1 ? "" : "s"} uploaded`
                            : "No field update yet")}
                      </p>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })
        )}
      </div>
    </>
  );
}
