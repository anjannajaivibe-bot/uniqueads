import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader, Status } from "@/components/ui";
import { requireAppUser } from "@/lib/auth/authorization";
import {
  getActiveWorkers,
  getOrderActivity,
  getOrderAssignments,
  getOrderById,
  getOrderLocations,
  getOrderSupervisors,
} from "@/lib/order-queries";
import {
  addOrderLocation,
  assignWorkerToOrder,
  updateOrder,
  updateOrderLocation,
  updateOrderStatus,
} from "../actions";

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

function inputDate(value: any) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function currency(value: unknown) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function whatsappHref(raw: any, orderNo: string) {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (!digits) return null;
  const phone = digits.length === 10 ? `91${digits}` : digits;
  const text = encodeURIComponent(
    `Dear Customer, Unique Ads order ${orderNo} is under execution. We will keep you updated on campaign progress.`
  );
  return `https://wa.me/${phone}?text=${text}`;
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const currentUser = await requireAppUser();
  const order = await getOrderById(id, currentUser);

  if (!order) notFound();
  const o = order as any;
  const canManage =
    currentUser.role === "super_admin" ||
    currentUser.role === "operations_manager";

  const [locations, assignments, activity, supervisors, workers] =
    await Promise.all([
      getOrderLocations(id),
      getOrderAssignments(id),
      getOrderActivity(id),
      canManage ? getOrderSupervisors() : Promise.resolve([]),
      canManage ? getActiveWorkers() : Promise.resolve([]),
    ]);

  const locationCount = locations.length;
  const completedLocations = locations.filter(
    (location: any) => location.status === "completed"
  ).length;
  const progress =
    locationCount === 0
      ? 0
      : Math.round(
          locations.reduce(
            (sum: number, location: any) =>
              sum + Number(location.progress_percent || 0),
            0
          ) / locationCount
        );

  const overdue =
    o.due_date &&
    !["completed", "invoiced", "closed", "cancelled"].includes(o.status) &&
    new Date(o.due_date).getTime() < Date.now();

  const whatsapp = whatsappHref(o.whatsapp || o.phone, o.order_no);

  return (
    <div className={canManage ? undefined : "supervisor-readonly"}>
      <PageHeader
        title={o.order_no}
        description={`${o.company_name} · ${o.campaign_name}`}
        action={
          <div className="header-actions">
            <Link href="/admin/orders" className="button button-secondary">
              Back to Orders
            </Link>
            {o.quotation_id ? (
              <Link
                href={`/admin/quotations/${o.quotation_id}`}
                className="button button-secondary"
              >
                View Quotation
              </Link>
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

      {!canManage ? (
        <div className="role-notice">
          <strong>Read-only field view.</strong> Planning, worker assignment and order-status controls are managed by Operations. Use Work Progress or Live Capture for field updates.
        </div>
      ) : null}

      <section className="panel order-hero-card">
        <div className="order-hero-head">
          <div>
            <div className="lead-status-row">
              <Status value={o.status} />
              {overdue ? <span className="overdue-pill">Order overdue</span> : null}
            </div>
            <h2>{o.campaign_name}</h2>
            <p>{o.work_instructions || "No work instructions recorded yet."}</p>
          </div>
          <div className="order-value-block">
            <span>Order Value</span>
            <strong>{currency(o.total_order_amount)}</strong>
            <small>Advance: {currency(o.advance_received)}</small>
          </div>
        </div>

        <div className="order-progress-overview">
          <div>
            <span>Overall Progress</span>
            <strong>{progress}%</strong>
          </div>
          <div className="order-progress-track">
            <span style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
          </div>
          <small>{completedLocations} of {locationCount} locations completed</small>
        </div>

        <div className="lead-facts order-facts">
          <div><span>Customer</span><strong>{o.company_name}</strong></div>
          <div><span>Advertising Type</span><strong>{o.advertising_type || "Not set"}</strong></div>
          <div><span>Start Date</span><strong>{date(o.start_date)}</strong></div>
          <div><span>Due Date</span><strong className={overdue ? "followup-overdue" : ""}>{date(o.due_date)}</strong></div>
          <div><span>Supervisor</span><strong>{o.supervisor_name || "Unassigned"}</strong></div>
          <div><span>Quotation</span><strong>{o.quotation_no || "Direct order"}</strong></div>
          <div><span>Customer Phone</span><strong>{o.phone || "Not provided"}</strong></div>
          <div><span>Created By</span><strong>{o.created_by_name || "System"}</strong></div>
        </div>
      </section>

      <div className="order-detail-grid">
        <section className="order-main-column">
          <article className="form-card">
            <div className="form-section-title">
              <div>
                <h2>Order Planning</h2>
                <p>Dates, supervisor and field instructions for the confirmed campaign.</p>
              </div>
            </div>

            <form action={updateOrder}>
              <input type="hidden" name="order_id" value={o.id} />
              <div className="form-grid">
                <label>
                  <span>Campaign Name *</span>
                  <input name="campaign_name" required defaultValue={o.campaign_name} />
                </label>
                <label>
                  <span>Advertising Type</span>
                  <input name="advertising_type" defaultValue={o.advertising_type || ""} />
                </label>
                <label>
                  <span>Start Date</span>
                  <input name="start_date" type="date" defaultValue={inputDate(o.start_date)} />
                </label>
                <label>
                  <span>Due Date</span>
                  <input name="due_date" type="date" defaultValue={inputDate(o.due_date)} />
                </label>
                <label>
                  <span>Supervisor</span>
                  <select name="assigned_supervisor" defaultValue={o.assigned_supervisor || ""}>
                    <option value="">Unassigned</option>
                    {supervisors.map((user: any) => (
                      <option key={user.id} value={user.id}>
                        {user.full_name} · {label(user.role)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="full">
                  <span>Work Instructions</span>
                  <textarea
                    name="work_instructions"
                    rows={4}
                    defaultValue={o.work_instructions || ""}
                  />
                </label>
              </div>
              <div className="form-actions">
                <button type="submit" className="button button-primary">
                  Save Planning
                </button>
              </div>
            </form>
          </article>

          <article className="form-card">
            <div className="form-section-title">
              <div>
                <h2>Campaign Locations</h2>
                <p>Track each wall, town, road or advertising location separately.</p>
              </div>
            </div>

            <form action={addOrderLocation}>
              <input type="hidden" name="order_id" value={o.id} />
              <div className="form-grid">
                <label>
                  <span>Location Name *</span>
                  <input
                    name="location_name"
                    required
                    placeholder="Example: Sangareddy Main Road - Wall 01"
                  />
                </label>
                <label>
                  <span>State</span>
                  <select name="state" defaultValue="">
                    <option value="">Select</option>
                    <option>Telangana</option>
                    <option>Andhra Pradesh</option>
                    <option>Karnataka</option>
                  </select>
                </label>
                <label>
                  <span>District</span>
                  <input name="district" placeholder="District" />
                </label>
                <label>
                  <span>City / Town</span>
                  <input name="city" placeholder="City / town" />
                </label>
                <label>
                  <span>Road</span>
                  <input name="road" placeholder="Road / highway" />
                </label>
                <label>
                  <span>Landmark</span>
                  <input name="landmark" placeholder="Nearby landmark" />
                </label>
                <label>
                  <span>Wall / Site Size</span>
                  <input name="wall_size" placeholder="Example: 20 ft × 10 ft" />
                </label>
                <label>
                  <span>Area (sq.ft)</span>
                  <input name="area_sqft" type="number" min="0" step="0.01" />
                </label>
                <label>
                  <span>Quantity</span>
                  <input name="quantity" type="number" min="1" step="1" defaultValue="1" />
                </label>
                <label>
                  <span>Planned Date</span>
                  <input name="planned_date" type="date" />
                </label>
                <label>
                  <span>Latitude</span>
                  <input name="latitude" type="number" step="0.0000001" />
                </label>
                <label>
                  <span>Longitude</span>
                  <input name="longitude" type="number" step="0.0000001" />
                </label>
                <label className="full">
                  <span>Notes</span>
                  <textarea name="notes" rows={2} />
                </label>
              </div>
              <div className="form-actions">
                <button type="submit" className="button button-primary">
                  Add Location
                </button>
              </div>
            </form>

            <div className="execution-location-list">
              {locations.length === 0 ? (
                <div className="empty-state">
                  No campaign locations yet. Add the first execution location above.
                </div>
              ) : (
                locations.map((location: any) => (
                  <details className="execution-location-card" key={location.id}>
                    <summary>
                      <div>
                        <strong>{location.location_name}</strong>
                        <span>
                          {[location.city, location.district, location.state]
                            .filter(Boolean)
                            .join(" · ") || "Location details not specified"}
                        </span>
                      </div>
                      <div className="execution-location-summary-right">
                        <span className={`status status-${location.status}`}>
                          {label(location.status)}
                        </span>
                        <strong>{Number(location.progress_percent || 0)}%</strong>
                      </div>
                    </summary>

                    <div className="execution-location-body">
                      <div className="location-meta-grid">
                        <div><span>Planned</span><strong>{date(location.planned_date)}</strong></div>
                        <div><span>Area</span><strong>{location.area_sqft ? `${location.area_sqft} sq.ft` : "Not set"}</strong></div>
                        <div><span>Quantity</span><strong>{location.quantity}</strong></div>
                        <div><span>Workers</span><strong>{location.worker_count}</strong></div>
                        <div><span>Client Approved</span><strong>{location.client_approved ? "Yes" : "No"}</strong></div>
                        <div><span>Completed</span><strong>{date(location.completed_date)}</strong></div>
                      </div>

                      <form action={updateOrderLocation}>
                        <input type="hidden" name="order_id" value={o.id} />
                        <input type="hidden" name="location_id" value={location.id} />
                        <div className="form-grid compact-grid">
                          <label>
                            <span>Status</span>
                            <select name="status" defaultValue={location.status}>
                              <option value="pending">Pending</option>
                              <option value="assigned">Assigned</option>
                              <option value="in_progress">In Progress</option>
                              <option value="quality_check">Quality Check</option>
                              <option value="completed">Completed</option>
                              <option value="blocked">Blocked</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          </label>
                          <label>
                            <span>Progress %</span>
                            <input
                              name="progress_percent"
                              type="number"
                              min="0"
                              max="100"
                              step="1"
                              defaultValue={location.progress_percent}
                            />
                          </label>
                          <label>
                            <span>Client Approved</span>
                            <select
                              name="client_approved"
                              defaultValue={location.client_approved ? "true" : "false"}
                            >
                              <option value="false">No</option>
                              <option value="true">Yes</option>
                            </select>
                          </label>
                          <label className="full">
                            <span>Execution Notes</span>
                            <textarea name="notes" rows={2} defaultValue={location.notes || ""} />
                          </label>
                        </div>
                        <div className="form-actions">
                          <button className="button button-secondary" type="submit">
                            Update Location
                          </button>
                        </div>
                      </form>
                    </div>
                  </details>
                ))
              )}
            </div>
          </article>

          <article className="form-card">
            <div className="form-section-title">
              <div>
                <h2>Worker Assignment</h2>
                <p>Assign a painter, helper, supervisor or installation worker to the order or a specific location.</p>
              </div>
            </div>

            {workers.length === 0 ? (
              <div className="empty-state">
                No active workers exist yet. Add workers from the Workers module before assigning field teams.
              </div>
            ) : (
              <form action={assignWorkerToOrder}>
                <input type="hidden" name="order_id" value={o.id} />
                <div className="form-grid">
                  <label>
                    <span>Worker *</span>
                    <select name="worker_id" required defaultValue="">
                      <option value="">Select worker</option>
                      {workers.map((worker: any) => (
                        <option key={worker.id} value={worker.id}>
                          {worker.name} · {label(worker.skill)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Location</span>
                    <select name="order_location_id" defaultValue="">
                      <option value="">Whole order / general assignment</option>
                      {locations.map((location: any) => (
                        <option key={location.id} value={location.id}>
                          {location.location_name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Role on Job</span>
                    <input name="role_on_job" placeholder="Painter / helper / team lead..." />
                  </label>
                  <label>
                    <span>Payment Mode</span>
                    <select name="agreed_payment_mode" defaultValue="">
                      <option value="">Use worker default</option>
                      <option value="daily">Daily</option>
                      <option value="per_wall">Per Wall</option>
                      <option value="per_sqft">Per sq.ft</option>
                      <option value="fixed">Fixed</option>
                      <option value="milestone">Milestone</option>
                    </select>
                  </label>
                  <label>
                    <span>Agreed Rate</span>
                    <input name="agreed_rate" type="number" min="0" step="0.01" />
                  </label>
                  <label>
                    <span>Agreed Total Amount</span>
                    <input name="agreed_amount" type="number" min="0" step="0.01" />
                  </label>
                  <label className="full">
                    <span>Assignment Notes</span>
                    <textarea name="notes" rows={2} />
                  </label>
                </div>
                <div className="form-actions">
                  <button className="button button-primary" type="submit">
                    Assign Worker
                  </button>
                </div>
              </form>
            )}

            <div className="assignment-list">
              {assignments.length === 0 ? (
                <div className="empty-state">No workers assigned yet.</div>
              ) : (
                assignments.map((assignment: any) => (
                  <div className="assignment-row" key={assignment.id}>
                    <div>
                      <strong>{assignment.worker_name}</strong>
                      <span>
                        {label(assignment.worker_skill)}
                        {assignment.role_on_job ? ` · ${assignment.role_on_job}` : ""}
                      </span>
                    </div>
                    <div>
                      <span>{assignment.location_name || "Whole order"}</span>
                      <strong>
                        {assignment.agreed_amount
                          ? currency(assignment.agreed_amount)
                          : assignment.agreed_rate
                            ? `${currency(assignment.agreed_rate)} · ${label(assignment.agreed_payment_mode || "")}`
                            : "Payment not set"}
                      </strong>
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>
        </section>

        <aside className="order-side-column">
          <article className="form-card sticky-card">
            <div className="form-section-title">
              <div>
                <h2>Order Status</h2>
                <p>Move the campaign through its operational stages.</p>
              </div>
            </div>

            <form action={updateOrderStatus}>
              <input type="hidden" name="order_id" value={o.id} />
              <label className="stacked-field">
                <span>Status</span>
                <select name="status" defaultValue={o.status}>
                  <option value="order_received">Order Received</option>
                  <option value="planning">Planning</option>
                  <option value="team_assigned">Team Assigned</option>
                  <option value="material_ready">Material Ready</option>
                  <option value="work_started">Work Started</option>
                  <option value="in_progress">In Progress</option>
                  <option value="quality_check">Quality Check</option>
                  <option value="customer_approval">Customer Approval</option>
                  <option value="completed">Completed</option>
                  <option value="invoiced">Invoiced</option>
                  <option value="closed">Closed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </label>
              <button type="submit" className="button button-primary button-full">
                Update Status
              </button>
            </form>

            <div className="side-divider" />

            <div className="order-finance-mini">
              <div><span>Order Value</span><strong>{currency(o.total_order_amount)}</strong></div>
              <div><span>Advance</span><strong>{currency(o.advance_received)}</strong></div>
              <div><span>Order Balance</span><strong>{currency(Math.max(0, Number(o.total_order_amount) - Number(o.advance_received)))}</strong></div>
            </div>
          </article>

          <article className="panel activity-panel">
            <div className="panel-head">
              <div>
                <h2>Activity</h2>
                <p>Order audit trail.</p>
              </div>
            </div>
            <div className="activity-list">
              {activity.length === 0 ? (
                <div className="empty-state">No order activity yet.</div>
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
    </div>
  );
}
