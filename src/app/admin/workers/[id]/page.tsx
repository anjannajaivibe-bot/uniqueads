import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui";
import {
  getWorkerActivity,
  getWorkerAssignments,
  getWorkerById,
  getWorkerOrderOptions,
  getWorkerPayments,
} from "@/lib/worker-queries";
import {
  toggleWorkerActive,
  updateWorker,
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

function whatsappHref(raw: any) {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (!digits) return null;
  const phone = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${phone}`;
}

export default async function WorkerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [worker, assignments, payments, orderOptions, activity] = await Promise.all([
    getWorkerById(id),
    getWorkerAssignments(id),
    getWorkerPayments(id),
    getWorkerOrderOptions(id),
    getWorkerActivity(id),
  ]);

  if (!worker) notFound();
  const w = worker as any;

  const agreedTotal = Number(w.agreed_total || 0);
  const paidTotal = Number(w.paid_total || 0);
  const trackedBalance = Math.max(0, agreedTotal - paidTotal);
  const whatsapp = whatsappHref(w.phone);

  return (
    <>
      <PageHeader
        title={w.name}
        description={`${w.worker_code || "Worker"} · ${label(w.skill)}`}
        action={
          <div className="header-actions">
            <Link href="/admin/workers" className="button button-secondary">
              Back to Workers
            </Link>
            {w.phone ? (
              <a href={`tel:${String(w.phone).replace(/\s/g, "")}`} className="button button-secondary">
                Call
              </a>
            ) : null}
            {whatsapp ? (
              <a href={whatsapp} target="_blank" rel="noreferrer" className="button button-whatsapp">
                WhatsApp
              </a>
            ) : null}
          </div>
        }
      />

      <section className="panel worker-hero-card">
        <div className="worker-hero-head">
          <div>
            <span className={`status ${w.is_active ? "status-completed" : "status-cancelled"}`}>
              {w.is_active ? "Active" : "Inactive"}
            </span>
            <h2>{label(w.skill)}</h2>
            <p>
              Default payment: {label(w.payment_mode)}
              {w.default_rate ? ` · ${currency(w.default_rate)}` : ""}
            </p>
          </div>
          <div className="worker-balance-box">
            <span>Tracked Paid</span>
            <strong>{currency(paidTotal)}</strong>
            <small>
              {agreedTotal > 0
                ? `Tracked balance ${currency(trackedBalance)}`
                : "No fixed agreed total recorded"}
            </small>
          </div>
        </div>

        <div className="lead-facts worker-facts">
          <div><span>Phone</span><strong>{w.phone || "Not provided"}</strong></div>
          <div><span>State</span><strong>{w.state || "Not set"}</strong></div>
          <div><span>Joined</span><strong>{date(w.joined_on)}</strong></div>
          <div><span>Payment Mode</span><strong>{label(w.payment_mode)}</strong></div>
          <div><span>UPI</span><strong>{w.upi_id || "Not set"}</strong></div>
          <div><span>IFSC</span><strong>{w.ifsc_code || "Not set"}</strong></div>
        </div>
      </section>

      <div className="worker-detail-grid">
        <section className="worker-main-column">
          <article className="form-card">
            <div className="form-section-title">
              <div>
                <h2>Edit Worker</h2>
                <p>Maintain contact, skill, payment basis and settlement information.</p>
              </div>
            </div>

            <form action={updateWorker}>
              <input type="hidden" name="worker_id" value={w.id} />
              <div className="form-grid">
                <label>
                  <span>Name *</span>
                  <input name="name" required defaultValue={w.name} />
                </label>
                <label>
                  <span>Phone</span>
                  <input name="phone" defaultValue={w.phone || ""} />
                </label>
                <label>
                  <span>Skill *</span>
                  <select name="skill" defaultValue={w.skill}>
                    <option value="painter">Painter</option>
                    <option value="helper">Helper</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="driver">Driver</option>
                    <option value="installer">Installer</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                <label>
                  <span>State</span>
                  <select name="state" defaultValue={w.state || ""}>
                    <option value="">Select</option>
                    <option>Telangana</option>
                    <option>Andhra Pradesh</option>
                    <option>Karnataka</option>
                  </select>
                </label>
                <label>
                  <span>Payment Mode *</span>
                  <select name="payment_mode" defaultValue={w.payment_mode}>
                    <option value="daily">Daily</option>
                    <option value="per_wall">Per Wall</option>
                    <option value="per_sqft">Per sq.ft</option>
                    <option value="fixed">Fixed</option>
                    <option value="milestone">Milestone</option>
                  </select>
                </label>
                <label>
                  <span>Default Rate</span>
                  <input
                    name="default_rate"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={w.default_rate ?? ""}
                  />
                </label>
                <label>
                  <span>Joined On</span>
                  <input name="joined_on" type="date" defaultValue={inputDate(w.joined_on)} />
                </label>
                <label className="full">
                  <span>Address</span>
                  <textarea name="address" rows={3} defaultValue={w.address || ""} />
                </label>
                <label>
                  <span>Account Name</span>
                  <input name="bank_account_name" defaultValue={w.bank_account_name || ""} />
                </label>
                <label>
                  <span>Bank Account Number</span>
                  <input name="bank_account_number" defaultValue={w.bank_account_number || ""} />
                </label>
                <label>
                  <span>IFSC</span>
                  <input name="ifsc_code" defaultValue={w.ifsc_code || ""} />
                </label>
                <label>
                  <span>UPI ID</span>
                  <input name="upi_id" defaultValue={w.upi_id || ""} />
                </label>
              </div>

              <div className="form-actions">
                <button type="submit" className="button button-primary">
                  Save Worker
                </button>
              </div>
            </form>
          </article>

          <article className="panel">
            <div className="panel-head">
              <div>
                <h2>Assignment History</h2>
                <p>Orders and locations this worker has been assigned to.</p>
              </div>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer / Campaign</th>
                    <th>Location</th>
                    <th>Assigned</th>
                    <th>Payment Basis</th>
                    <th className="align-right">Agreed</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="empty-cell">
                        No assignments yet.
                      </td>
                    </tr>
                  ) : (
                    assignments.map((assignment: any) => (
                      <tr key={assignment.id}>
                        <td>
                          <Link href={`/admin/orders/${assignment.order_id}`} className="mono">
                            {assignment.order_no}
                          </Link>
                        </td>
                        <td>
                          <strong>{assignment.company_name}</strong>
                          <div className="table-subtext">{assignment.campaign_name}</div>
                        </td>
                        <td>{assignment.location_name || "Whole order"}</td>
                        <td>{date(assignment.assigned_on)}</td>
                        <td>{label(assignment.agreed_payment_mode || w.payment_mode)}</td>
                        <td className="align-right">
                          <strong>
                            {assignment.agreed_amount
                              ? currency(assignment.agreed_amount)
                              : assignment.agreed_rate
                                ? currency(assignment.agreed_rate)
                                : "Not set"}
                          </strong>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </article>

          <article className="panel" style={{ padding: 20 }}>
            <h2>Worker Payments</h2>
            <p>Payments are recorded by Accounts through the Finance module. Operations can review payment history below.</p>
          </article>

          <article className="panel">
            <div className="panel-head">
              <div>
                <h2>Payment History</h2>
                <p>All recorded payments for this worker.</p>
              </div>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Payment</th>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Order</th>
                    <th>Method</th>
                    <th className="align-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="empty-cell">
                        No payments recorded yet.
                      </td>
                    </tr>
                  ) : (
                    payments.map((payment: any) => (
                      <tr key={payment.id}>
                        <td>
                          <span className="mono">{payment.payment_no || "Payment"}</span>
                          {payment.reference_no ? (
                            <div className="table-subtext">{payment.reference_no}</div>
                          ) : null}
                        </td>
                        <td>{date(payment.payment_date)}</td>
                        <td>{label(payment.payment_type)}</td>
                        <td>
                          {payment.order_id ? (
                            <Link href={`/admin/orders/${payment.order_id}`} className="text-link">
                              {payment.order_no}
                            </Link>
                          ) : (
                            "General"
                          )}
                        </td>
                        <td>{payment.payment_method ? label(payment.payment_method) : "Not set"}</td>
                        <td className="align-right"><strong>{currency(payment.amount)}</strong></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </article>
        </section>

        <aside className="worker-side-column">
          <article className="form-card sticky-card">
            <div className="form-section-title">
              <div>
                <h2>Worker Status</h2>
                <p>Inactive workers cannot be selected for new order assignments.</p>
              </div>
            </div>

            <form action={toggleWorkerActive}>
              <input type="hidden" name="worker_id" value={w.id} />
              <input type="hidden" name="next_active" value={w.is_active ? "false" : "true"} />
              <button
                type="submit"
                className={`button button-full ${w.is_active ? "button-danger-soft" : "button-primary"}`}
              >
                {w.is_active ? "Deactivate Worker" : "Reactivate Worker"}
              </button>
            </form>

            <div className="side-divider" />

            <div className="worker-payment-summary">
              <div><span>Total Paid</span><strong>{currency(paidTotal)}</strong></div>
              <div><span>Tracked Agreed Total</span><strong>{currency(agreedTotal)}</strong></div>
              <div><span>Tracked Balance</span><strong>{currency(trackedBalance)}</strong></div>
            </div>

            <p className="worker-balance-note">
              The tracked balance uses assignments where an agreed total amount was entered. Daily or per-unit jobs without a fixed total are not treated as outstanding.
            </p>
          </article>

          <article className="panel activity-panel">
            <div className="panel-head">
              <div>
                <h2>Activity</h2>
                <p>Worker master and payment audit trail.</p>
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
