import { redirect } from "next/navigation";
import { neon } from "@neondatabase/serverless";
import { getPasswordSessionAppUser } from "@/lib/auth/password-session";
import { LiveCaptureClient } from "@/components/work-progress/live-capture-client";

export const dynamic = "force-dynamic";

const FIELD_ROLES = new Set([
  "super_admin",
  "operations_manager",
  "supervisor",
]);

export default async function LiveCapturePage() {
  const user = await getPasswordSessionAppUser();

  if (!user) redirect("/login");
  if (!FIELD_ROLES.has(user.role)) redirect("/unauthorized");

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not configured.");

  const sql = neon(databaseUrl);

  let locations: any[];

  if (user.role === "supervisor" && user.worker_id) {
    locations = await sql`
      select
        ol.id,
        ol.order_id,
        o.order_no,
        o.campaign_name,
        ol.location_name,
        ol.city,
        ol.district,
        ol.state,
        ol.progress_percent,
        ol.status
      from public.order_locations ol
      join public.orders o on o.id = ol.order_id
      where ol.status not in ('completed', 'cancelled')
        and o.status <> 'cancelled'
        and (
          o.assigned_supervisor = ${user.worker_id}
          or exists (
            select 1
            from public.order_worker_assignments owa
            where owa.order_id = o.id
              and owa.worker_id = ${user.worker_id}
          )
        )
      order by o.due_date nulls last, o.order_no, ol.location_name
    `;
  } else {
    locations = await sql`
      select
        ol.id,
        ol.order_id,
        o.order_no,
        o.campaign_name,
        ol.location_name,
        ol.city,
        ol.district,
        ol.state,
        ol.progress_percent,
        ol.status
      from public.order_locations ol
      join public.orders o on o.id = ol.order_id
      where ol.status not in ('completed', 'cancelled')
        and o.status <> 'cancelled'
      order by o.due_date nulls last, o.order_no, ol.location_name
    `;
  }

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div>
        <p style={{ margin: 0, color: "#f47b20", fontWeight: 850 }}>
          Work Progress
        </p>
        <h1 style={{ margin: "5px 0" }}>
          Live Photo Capture
        </h1>
        <p style={{ margin: 0, color: "#667085" }}>
          Camera-only proof with live GPS, device capture time,
          server timestamp and logged-in username.
        </p>
      </div>

      <LiveCaptureClient
        locations={locations as any}
        username={String(user.username || user.full_name || "team-user")}
      />

      <p style={{ margin: 0 }}>
        <a href="/admin/work-progress">← Back to Work Progress</a>
      </p>
    </div>
  );
}
