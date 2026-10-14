import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader, Status } from "@/components/ui";
import { requireAppUser } from "@/lib/auth/authorization";
import { WorkUpdateForm } from "@/components/work-update-form";
import { presignWorkPhotoDownload } from "@/lib/storage";
import {
  getLocationWorkers,
  getWorkLocation,
  getWorkPhotos,
  getWorkUpdates,
} from "@/lib/work-progress-queries";

export const dynamic = "force-dynamic";

function label(value: string | null | undefined) {
  return String(value ?? "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
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

export default async function WorkLocationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const currentUser = await requireAppUser();
  const location = await getWorkLocation(id, currentUser);

  if (!location) notFound();
  const l = location as any;

  const [updates, photoRows, workers] = await Promise.all([
    getWorkUpdates(id),
    getWorkPhotos(id),
    getLocationWorkers(id, String(l.order_id)),
  ]);

  const photos = await Promise.all(
    (photoRows as any[]).map(async (photo) => ({
      ...photo,
      signed_url: await presignWorkPhotoDownload(String(photo.file_url)),
    }))
  );

  const groupedPhotos = {
    before: photos.filter((photo) => photo.photo_type === "before"),
    during: photos.filter((photo) => photo.photo_type === "during"),
    completed: photos.filter((photo) => photo.photo_type === "completed"),
    quality_issue: photos.filter((photo) => photo.photo_type === "quality_issue"),
    other: photos.filter((photo) => photo.photo_type === "other"),
  };

  return (
    <>
      <PageHeader
        title={l.location_name}
        description={`${l.order_no} · ${l.company_name} · ${l.campaign_name}`}
        action={
          <div className="header-actions">
            <Link href="/admin/work-progress" className="button button-secondary">
              Back to Work Progress
            </Link>
            <Link href={`/admin/orders/${l.order_id}`} className="button button-secondary">
              Open Order
            </Link>
          </div>
        }
      />

      <section className="panel work-location-hero">
        <div className="work-location-hero-head">
          <div>
            <Status value={l.status} />
            <h2>{Number(l.progress_percent || 0)}% Complete</h2>
            <p>
              {[l.road, l.landmark, l.city, l.district, l.state]
                .filter(Boolean)
                .join(" · ") || "Detailed site address not recorded."}
            </p>
          </div>
          <div className="work-location-progress-big">
            <strong>{Number(l.progress_percent || 0)}%</strong>
            <div className="order-progress-track">
              <span
                style={{
                  width: `${Math.max(0, Math.min(100, Number(l.progress_percent || 0)))}%`,
                }}
              />
            </div>
          </div>
        </div>

        <div className="lead-facts work-location-facts">
          <div><span>Planned Date</span><strong>{date(l.planned_date)}</strong></div>
          <div><span>Completed Date</span><strong>{date(l.completed_date)}</strong></div>
          <div><span>Wall Size</span><strong>{l.wall_size || "Not set"}</strong></div>
          <div><span>Area</span><strong>{l.area_sqft ? `${l.area_sqft} sq.ft` : "Not set"}</strong></div>
          <div><span>Quantity</span><strong>{l.quantity}</strong></div>
          <div><span>Client Approved</span><strong>{l.client_approved ? "Yes" : "No"}</strong></div>
          <div><span>Supervisor</span><strong>{l.supervisor_name || "Unassigned"}</strong></div>
          <div><span>GPS</span><strong>{l.latitude && l.longitude ? `${l.latitude}, ${l.longitude}` : "Not captured"}</strong></div>
        </div>
      </section>

      <div className="work-detail-grid">
        <section className="work-main-column">
          <article className="form-card">
            <div className="form-section-title">
              <div>
                <h2>Record Field Update</h2>
                <p>Progress, issue, QC and completion updates are permanently recorded with optional GPS proof.</p>
              </div>
            </div>
            <WorkUpdateForm
              locationId={String(l.id)}
              currentProgress={Number(l.progress_percent || 0)}
              clientApproved={Boolean(l.client_approved)}
            />
          </article>

          <article className="form-card">
            <div className="form-section-title">
              <div>
                <h2>Live Site Photo Proof</h2>
                <p>
                  Work proof is camera-only with live GPS, device capture time,
                  server timestamp and logged-in username. Gallery uploads are disabled.
                </p>
              </div>
            </div>
            <Link href="/admin/work-progress/live-capture" className="button button-primary">
              Open Live Photo Capture
            </Link>
          </article>

          <article className="panel work-gallery-panel">
            <div className="panel-head">
              <div>
                <h2>Photo Proof</h2>
                <p>Before, during, completion and quality evidence for this location.</p>
              </div>
              <strong>{photos.length} photos</strong>
            </div>

            {photos.length === 0 ? (
              <div className="empty-state">No site photos uploaded yet.</div>
            ) : (
              <div className="work-photo-sections">
                {[
                  ["before", "Before Work"],
                  ["during", "During Work"],
                  ["completed", "Completed Work"],
                  ["quality_issue", "Quality Issues"],
                  ["other", "Other"],
                ].map(([type, title]) => {
                  const items = groupedPhotos[type as keyof typeof groupedPhotos];
                  if (items.length === 0) return null;

                  return (
                    <section className="work-photo-section" key={type}>
                      <div className="work-photo-section-title">
                        <h3>{title}</h3>
                        <span>{items.length}</span>
                      </div>
                      <div className="work-photo-grid">
                        {items.map((photo: any) => (
                          <figure className="work-photo-card" key={photo.id}>
                            <a href={photo.signed_url} target="_blank" rel="noreferrer">
                              <img
                                src={photo.signed_url}
                                alt={photo.caption || `${title} site photo`}
                                loading="lazy"
                              />
                            </a>
                            <figcaption>
                              <strong>{photo.caption || title}</strong>
                              <span>
                                {dateTime(photo.captured_at || photo.created_at)}
                              </span>
                              <span>
                                {photo.uploaded_by_name || "System"}
                                {photo.latitude && photo.longitude
                                  ? ` · GPS ${photo.latitude}, ${photo.longitude}`
                                  : ""}
                              </span>
                            </figcaption>
                          </figure>
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            )}
          </article>

          <article className="panel">
            <div className="panel-head">
              <div>
                <h2>Progress Timeline</h2>
                <p>Chronological field updates for this advertising location.</p>
              </div>
            </div>

            <div className="timeline work-timeline">
              {updates.length === 0 ? (
                <div className="empty-state">No field updates recorded yet.</div>
              ) : (
                updates.map((update: any) => (
                  <div className="timeline-item" key={update.id}>
                    <div className="timeline-dot" />
                    <div className="timeline-card">
                      <div className="timeline-head">
                        <strong>{label(update.status)} · {update.progress_percent ?? 0}%</strong>
                        <span>{dateTime(update.recorded_at)}</span>
                      </div>
                      <p>{update.update_text || "No notes entered."}</p>
                      <div className="timeline-meta">
                        {update.created_by_name || "System"}
                        {update.latitude && update.longitude
                          ? ` · GPS ${update.latitude}, ${update.longitude}`
                          : ""}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>
        </section>

        <aside className="work-side-column">
          <article className="panel work-team-card">
            <div className="panel-head">
              <div>
                <h2>Field Team</h2>
                <p>Workers assigned to this location or the whole order.</p>
              </div>
            </div>
            <div className="work-team-list">
              {workers.length === 0 ? (
                <div className="empty-state">
                  No worker assignment found for this site.
                </div>
              ) : (
                workers.map((worker: any) => (
                  <div className="work-team-member" key={worker.id}>
                    <div>
                      <strong>{worker.name}</strong>
                      <span>
                        {label(worker.skill)}
                        {worker.role_on_job ? ` · ${worker.role_on_job}` : ""}
                      </span>
                    </div>
                    {worker.phone ? <a href={`tel:${worker.phone}`}>Call</a> : null}
                  </div>
                ))
              )}
            </div>
          </article>

          <article className="panel work-proof-checklist">
            <div className="panel-head">
              <div>
                <h2>Proof Checklist</h2>
                <p>Minimum field evidence before closing the site.</p>
              </div>
            </div>
            <div className="proof-check-list">
              <div className={groupedPhotos.before.length > 0 ? "proof-done" : ""}>
                <span>{groupedPhotos.before.length > 0 ? "✓" : "○"}</span>
                Before-work photo
              </div>
              <div className={groupedPhotos.during.length > 0 ? "proof-done" : ""}>
                <span>{groupedPhotos.during.length > 0 ? "✓" : "○"}</span>
                During-work photo
              </div>
              <div className={groupedPhotos.completed.length > 0 ? "proof-done" : ""}>
                <span>{groupedPhotos.completed.length > 0 ? "✓" : "○"}</span>
                Completed-work photo
              </div>
              <div className={l.latitude && l.longitude ? "proof-done" : ""}>
                <span>{l.latitude && l.longitude ? "✓" : "○"}</span>
                GPS location
              </div>
              <div className={l.client_approved ? "proof-done" : ""}>
                <span>{l.client_approved ? "✓" : "○"}</span>
                Client approval
              </div>
            </div>
          </article>
        </aside>
      </div>
    </>
  );
}
