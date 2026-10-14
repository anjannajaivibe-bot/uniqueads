import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader, Status } from "@/components/ui";
import {
  getAssignableUsers,
  getLeadActivity,
  getLeadById,
  getLeadFollowups,
} from "@/lib/lead-queries";
import {
  addLeadFollowup,
  convertLeadToCustomer,
  updateLead,
  updateLeadStatus,
} from "../../actions";

export const dynamic = "force-dynamic";

function label(value: string | null | undefined) {
  return String(value ?? "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function dateTime(value: any) {
  if (!value) return "Not scheduled";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Not scheduled";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function dateTimeLocal(value: any) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function whatsappHref(raw: string | null | undefined) {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (!digits) return null;
  const normalized = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${normalized}`;
}

function phoneHref(raw: string | null | undefined) {
  const value = String(raw ?? "").trim();
  return value ? `tel:${value.replace(/\s/g, "")}` : null;
}

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [lead, followups, activity, users] = await Promise.all([
    getLeadById(id),
    getLeadFollowups(id),
    getLeadActivity(id),
    getAssignableUsers(),
  ]);

  if (!lead) notFound();

  const l = lead as any;
  const whatsapp = whatsappHref(l.whatsapp || l.phone);
  const phone = phoneHref(l.phone);
  const overdue =
    l.next_follow_up_at &&
    !["won", "lost"].includes(l.status) &&
    new Date(l.next_follow_up_at).getTime() < Date.now();

  return (
    <>
      <PageHeader
        title={l.company_name || l.contact_person}
        description={`${l.lead_no} · ${l.contact_person}`}
        action={
          <div className="header-actions">
            <Link href="/admin/leads" className="button button-secondary">
              Back to Leads
            </Link>
            {phone ? (
              <a href={phone} className="button button-secondary">
                Call
              </a>
            ) : null}
            {whatsapp ? (
              <a
                href={whatsapp}
                target="_blank"
                rel="noreferrer"
                className="button button-whatsapp"
              >
                WhatsApp
              </a>
            ) : null}
          </div>
        }
      />

      <div className="lead-detail-grid">
        <section className="lead-main-column">
          <article className="panel lead-summary-card">
            <div className="lead-summary-head">
              <div>
                <div className="lead-status-row">
                  <Status value={l.status} />
                  {overdue ? <span className="overdue-pill">Follow-up overdue</span> : null}
                </div>
                <h2>{l.advertising_type || "Advertising requirement not specified"}</h2>
                <p>{l.requirement || "No requirement notes recorded yet."}</p>
              </div>
              <div className="lead-next-action">
                <span>Next Follow-up</span>
                <strong className={overdue ? "followup-overdue" : ""}>
                  {dateTime(l.next_follow_up_at)}
                </strong>
              </div>
            </div>

            <div className="lead-facts">
              <div><span>Phone</span><strong>{l.phone}</strong></div>
              <div><span>WhatsApp</span><strong>{l.whatsapp || l.phone || "Not provided"}</strong></div>
              <div><span>Email</span><strong>{l.email || "Not provided"}</strong></div>
              <div><span>Location</span><strong>{l.location || "Not provided"}</strong></div>
              <div><span>Locations</span><strong>{l.number_of_locations ?? "Not estimated"}</strong></div>
              <div><span>Wall Area</span><strong>{l.estimated_wall_area_sqft ? `${l.estimated_wall_area_sqft} sq.ft` : "Not estimated"}</strong></div>
              <div><span>Duration</span><strong>{l.campaign_duration_days ? `${l.campaign_duration_days} days` : "Not estimated"}</strong></div>
              <div><span>Source</span><strong>{label(l.source)}</strong></div>
              <div><span>Assigned To</span><strong>{l.assigned_to_name || "Unassigned"}</strong></div>
              <div><span>Created By</span><strong>{l.created_by_name || "System"}</strong></div>
            </div>

            {l.customer_id ? (
              <div className="conversion-banner success-banner">
                <div>
                  <strong>Converted Customer</strong>
                  <span>{l.customer_code || l.customer_company_name}</span>
                </div>
                <Link href="/admin/customers" className="text-link">
                  View Customers
                </Link>
              </div>
            ) : null}

            {l.status === "lost" && l.lost_reason ? (
              <div className="conversion-banner lost-banner">
                <div>
                  <strong>Lost Reason</strong>
                  <span>{l.lost_reason}</span>
                </div>
              </div>
            ) : null}
          </article>

          <article className="form-card">
            <div className="form-section-title">
              <div>
                <h2>Edit Lead</h2>
                <p>Update the requirement, contact details, ownership or next action.</p>
              </div>
            </div>

            <form action={updateLead}>
              <input type="hidden" name="lead_id" value={l.id} />
              <div className="form-grid">
                <label>
                  <span>Company Name</span>
                  <input name="company_name" defaultValue={l.company_name || ""} />
                </label>
                <label>
                  <span>Contact Person *</span>
                  <input name="contact_person" required defaultValue={l.contact_person} />
                </label>
                <label>
                  <span>Phone *</span>
                  <input name="phone" required defaultValue={l.phone} />
                </label>
                <label>
                  <span>WhatsApp</span>
                  <input name="whatsapp" defaultValue={l.whatsapp || ""} />
                </label>
                <label>
                  <span>Email</span>
                  <input name="email" type="email" defaultValue={l.email || ""} />
                </label>
                <label>
                  <span>Location</span>
                  <input name="location" defaultValue={l.location || ""} />
                </label>
                <label>
                  <span>Advertising Type</span>
                  <select name="advertising_type" defaultValue={l.advertising_type || ""}>
                    <option value="">Select</option>
                    <option>Wall Painting</option>
                    <option>Hoardings</option>
                    <option>Outdoor Advertising</option>
                    <option>Rural Advertising</option>
                    <option>Highway Advertising</option>
                    <option>Other</option>
                  </select>
                </label>
                <label>
                  <span>Number of Locations</span>
                  <input
                    name="number_of_locations"
                    type="number"
                    min="0"
                    defaultValue={l.number_of_locations ?? ""}
                  />
                </label>
                <label>
                  <span>Estimated Wall Area (sq.ft)</span>
                  <input
                    name="estimated_wall_area_sqft"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={l.estimated_wall_area_sqft ?? ""}
                  />
                </label>
                <label>
                  <span>Campaign Duration (days)</span>
                  <input
                    name="campaign_duration_days"
                    type="number"
                    min="0"
                    defaultValue={l.campaign_duration_days ?? ""}
                  />
                </label>
                <label>
                  <span>Lead Source</span>
                  <select name="source" defaultValue={l.source}>
                    <option value="direct">Direct</option>
                    <option value="google">Google</option>
                    <option value="website">Website</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="referral">Referral</option>
                    <option value="existing_customer">Existing Customer</option>
                    <option value="meta">Meta</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                <label>
                  <span>Assign To</span>
                  <select name="assigned_to" defaultValue={l.assigned_to || ""}>
                    <option value="">Unassigned</option>
                    {users.map((user: any) => (
                      <option key={user.id} value={user.id}>
                        {user.full_name} · {label(user.role)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Next Follow-up</span>
                  <input
                    name="next_follow_up_at"
                    type="datetime-local"
                    defaultValue={dateTimeLocal(l.next_follow_up_at)}
                  />
                </label>
                <label className="full">
                  <span>Requirement</span>
                  <textarea name="requirement" rows={4} defaultValue={l.requirement || ""} />
                </label>
                <label className="full">
                  <span>Remarks</span>
                  <textarea name="remarks" rows={3} defaultValue={l.remarks || ""} />
                </label>
              </div>
              <div className="form-actions">
                <button type="submit" className="button button-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </article>

          <article className="form-card">
            <div className="form-section-title">
              <div>
                <h2>Follow-up History</h2>
                <p>Every call, WhatsApp, email, meeting and site visit is recorded here.</p>
              </div>
            </div>

            <form action={addLeadFollowup} className="followup-form">
              <input type="hidden" name="lead_id" value={l.id} />
              <div className="form-grid">
                <label>
                  <span>Channel *</span>
                  <select name="channel" defaultValue="call" required>
                    <option value="call">Call</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="email">Email</option>
                    <option value="meeting">Meeting</option>
                    <option value="site_visit">Site Visit</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                <label>
                  <span>Outcome</span>
                  <input name="outcome" placeholder="Interested, call later, requirement received..." />
                </label>
                <label>
                  <span>Next Follow-up</span>
                  <input name="next_follow_up_at" type="datetime-local" />
                </label>
                <label className="full">
                  <span>Follow-up Notes *</span>
                  <textarea
                    name="notes"
                    required
                    rows={3}
                    placeholder="What was discussed and what is the next action?"
                  />
                </label>
              </div>
              <div className="form-actions">
                <button type="submit" className="button button-primary">
                  Add Follow-up
                </button>
              </div>
            </form>

            <div className="timeline">
              {followups.length === 0 ? (
                <div className="empty-state">No follow-ups recorded yet.</div>
              ) : (
                followups.map((item: any) => (
                  <div className="timeline-item" key={item.id}>
                    <div className="timeline-dot" />
                    <div className="timeline-card">
                      <div className="timeline-head">
                        <strong>{label(item.channel)}</strong>
                        <span>{dateTime(item.follow_up_at)}</span>
                      </div>
                      {item.outcome ? <div className="timeline-outcome">{item.outcome}</div> : null}
                      <p>{item.notes}</p>
                      <div className="timeline-meta">
                        By {item.created_by_name || "System"}
                        {item.next_follow_up_at
                          ? ` · Next: ${dateTime(item.next_follow_up_at)}`
                          : ""}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>
        </section>

        <aside className="lead-side-column">
          <article className="form-card sticky-card">
            <div className="form-section-title">
              <div>
                <h2>Pipeline Status</h2>
                <p>Keep the lead stage current.</p>
              </div>
            </div>

            <form action={updateLeadStatus}>
              <input type="hidden" name="lead_id" value={l.id} />
              <label className="stacked-field">
                <span>Status</span>
                <select name="status" defaultValue={l.status}>
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="requirement_received">Requirement Received</option>
                  <option value="quotation_sent">Quotation Sent</option>
                  <option value="negotiation">Negotiation</option>
                  <option value="won">Won</option>
                  <option value="lost">Lost</option>
                </select>
              </label>
              <label className="stacked-field">
                <span>Lost Reason</span>
                <textarea
                  name="lost_reason"
                  rows={3}
                  defaultValue={l.lost_reason || ""}
                  placeholder="Required only when status is Lost"
                />
              </label>
              <button type="submit" className="button button-primary button-full">
                Update Status
              </button>
            </form>

            {!l.customer_id ? (
              <>
                <div className="side-divider" />
                <div className="conversion-box">
                  <strong>Convert to Customer</strong>
                  <p>
                    Creates the customer record and marks this lead as Won. No lead data is deleted.
                  </p>
                  <form action={convertLeadToCustomer}>
                    <input type="hidden" name="lead_id" value={l.id} />
                    <button type="submit" className="button button-secondary button-full">
                      Convert Lead
                    </button>
                  </form>
                </div>
              </>
            ) : null}
          </article>

          <article className="panel activity-panel">
            <div className="panel-head">
              <div>
                <h2>Activity</h2>
                <p>Audit trail for this lead.</p>
              </div>
            </div>
            <div className="activity-list">
              {activity.length === 0 ? (
                <div className="empty-state">No activity recorded yet.</div>
              ) : (
                activity.map((item: any) => (
                  <div className="activity-item" key={item.id}>
                    <span className="activity-dot" />
                    <div>
                      <strong>{item.description}</strong>
                      <span>
                        {item.actor_name || "System"} · {dateTime(item.created_at)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>
        </aside>
      </div>
    </>
  );
}
