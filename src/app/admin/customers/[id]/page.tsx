import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui";
import {
  getCustomerActivity,
  getCustomerById,
  getCustomerInvoices,
  getCustomerLeads,
  getCustomerOrders,
  getCustomerPayments,
  getCustomerQuotations,
} from "@/lib/customer-queries";
import {
  toggleCustomerActive,
  updateCustomer,
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
  return `https://wa.me/${digits.length === 10 ? `91${digits}` : digits}`;
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [
    customer,
    orders,
    quotations,
    invoices,
    payments,
    leads,
    activity,
  ] = await Promise.all([
    getCustomerById(id),
    getCustomerOrders(id),
    getCustomerQuotations(id),
    getCustomerInvoices(id),
    getCustomerPayments(id),
    getCustomerLeads(id),
    getCustomerActivity(id),
  ]);

  if (!customer) notFound();
  const c = customer as any;

  const orderValue = (orders as any[]).reduce(
    (sum, row) => sum + Number(row.total_order_amount || 0),
    0
  );
  const invoiced = (invoices as any[]).reduce(
    (sum, row) => sum + Number(row.total_amount || 0),
    0
  );
  const received = (payments as any[]).reduce(
    (sum, row) => sum + Number(row.amount || 0),
    0
  );
  const outstanding = Math.max(0, invoiced - received);
  const whatsapp = whatsappHref(c.whatsapp || c.phone);

  return (
    <>
      <PageHeader
        title={c.company_name}
        description={`${c.customer_code || "Customer"}${c.contact_person ? ` · ${c.contact_person}` : ""}`}
        action={
          <div className="header-actions">
            <Link href="/admin/customers" className="button button-secondary">
              Back to Customers
            </Link>
            <Link
              href={`/admin/quotations/new?customer=${c.id}`}
              className="button button-primary"
            >
              + New Quotation
            </Link>
            {c.phone ? (
              <a href={`tel:${String(c.phone).replace(/\s/g, "")}`} className="button button-secondary">
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

      <section className="panel customer-account-hero">
        <div className="customer-account-head">
          <div>
            <span className={`status ${c.is_active ? "status-completed" : "status-cancelled"}`}>
              {c.is_active ? "Active Customer" : "Inactive Customer"}
            </span>
            <h2>{c.company_name}</h2>
            <p>
              {[c.city, c.state, c.pincode].filter(Boolean).join(" · ") ||
                "Billing location not set"}
            </p>
          </div>
          <div className="customer-outstanding">
            <span>Outstanding</span>
            <strong>{currency(outstanding)}</strong>
            <small>Invoiced {currency(invoiced)} · Received {currency(received)}</small>
          </div>
        </div>

        <div className="customer-kpis">
          <div><span>Order Value</span><strong>{currency(orderValue)}</strong></div>
          <div><span>Orders</span><strong>{orders.length}</strong></div>
          <div><span>Quotations</span><strong>{quotations.length}</strong></div>
          <div><span>Invoices</span><strong>{invoices.length}</strong></div>
        </div>

        <div className="lead-facts customer-facts">
          <div><span>Contact</span><strong>{c.contact_person || "Not set"}</strong></div>
          <div><span>Phone</span><strong>{c.phone || "Not set"}</strong></div>
          <div><span>Email</span><strong>{c.email || "Not set"}</strong></div>
          <div><span>GSTIN</span><strong>{c.gstin || "Not set"}</strong></div>
          <div><span>Created By</span><strong>{c.created_by_name || "System"}</strong></div>
          <div><span>Created</span><strong>{date(c.created_at)}</strong></div>
        </div>
      </section>

      <div className="customer-detail-grid">
        <section className="customer-main-column">
          <article className="form-card">
            <div className="form-section-title">
              <div>
                <h2>Edit Customer</h2>
                <p>Keep billing and contact data accurate before quotation or invoice generation.</p>
              </div>
            </div>

            <form action={updateCustomer}>
              <input type="hidden" name="customer_id" value={c.id} />
              <div className="form-grid">
                <label>
                  <span>Company / Customer Name *</span>
                  <input name="company_name" required defaultValue={c.company_name} />
                </label>
                <label>
                  <span>Contact Person</span>
                  <input name="contact_person" defaultValue={c.contact_person || ""} />
                </label>
                <label>
                  <span>Phone</span>
                  <input name="phone" defaultValue={c.phone || ""} />
                </label>
                <label>
                  <span>WhatsApp</span>
                  <input name="whatsapp" defaultValue={c.whatsapp || ""} />
                </label>
                <label>
                  <span>Email</span>
                  <input name="email" type="email" defaultValue={c.email || ""} />
                </label>
                <label>
                  <span>GSTIN</span>
                  <input name="gstin" defaultValue={c.gstin || ""} />
                </label>
                <label>
                  <span>City</span>
                  <input name="city" defaultValue={c.city || ""} />
                </label>
                <label>
                  <span>State</span>
                  <select name="state" defaultValue={c.state || ""}>
                    <option value="">Select</option>
                    <option>Telangana</option>
                    <option>Andhra Pradesh</option>
                    <option>Karnataka</option>
                    <option>Other</option>
                  </select>
                </label>
                <label>
                  <span>Pincode</span>
                  <input name="pincode" defaultValue={c.pincode || ""} />
                </label>
                <label className="full">
                  <span>Billing Address</span>
                  <textarea name="billing_address" rows={3} defaultValue={c.billing_address || ""} />
                </label>
                <label className="full">
                  <span>Internal Notes</span>
                  <textarea name="notes" rows={3} defaultValue={c.notes || ""} />
                </label>
              </div>
              <div className="form-actions">
                <button type="submit" className="button button-primary">
                  Save Customer
                </button>
              </div>
            </form>
          </article>

          <article className="panel">
            <div className="panel-head">
              <div>
                <h2>Orders</h2>
                <p>Confirmed campaigns for this customer.</p>
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Campaign</th>
                    <th>Status</th>
                    <th>Due</th>
                    <th className="align-right">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr><td colSpan={5} className="empty-cell">No orders yet.</td></tr>
                  ) : (
                    orders.map((row: any) => (
                      <tr key={row.id}>
                        <td><Link href={`/admin/orders/${row.id}`} className="mono">{row.order_no}</Link></td>
                        <td>{row.campaign_name}</td>
                        <td><span className={`status status-${row.status}`}>{label(row.status)}</span></td>
                        <td>{date(row.due_date)}</td>
                        <td className="align-right"><strong>{currency(row.total_order_amount)}</strong></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </article>

          <article className="customer-commercial-grid">
            <section className="panel">
              <div className="panel-head">
                <div>
                  <h2>Quotations</h2>
                  <p>Commercial offers issued to this account.</p>
                </div>
              </div>
              <div className="customer-mini-list">
                {quotations.length === 0 ? (
                  <div className="empty-state">No quotations yet.</div>
                ) : (
                  quotations.map((row: any) => (
                    <Link href={`/admin/quotations/${row.id}`} key={row.id} className="customer-mini-row">
                      <div>
                        <strong>{row.quotation_no}</strong>
                        <span>{date(row.quotation_date)} · {label(row.status)}</span>
                      </div>
                      <strong>{currency(row.grand_total)}</strong>
                    </Link>
                  ))
                )}
              </div>
            </section>

            <section className="panel">
              <div className="panel-head">
                <div>
                  <h2>Invoices</h2>
                  <p>Billing and outstanding position.</p>
                </div>
              </div>
              <div className="customer-mini-list">
                {invoices.length === 0 ? (
                  <div className="empty-state">No invoices yet.</div>
                ) : (
                  invoices.map((row: any) => (
                    <div key={row.id} className="customer-mini-row">
                      <div>
                        <strong>{row.invoice_no}</strong>
                        <span>{date(row.invoice_date)} · {label(row.status)}</span>
                      </div>
                      <strong>{currency(row.total_amount)}</strong>
                    </div>
                  ))
                )}
              </div>
            </section>
          </article>

          <article className="panel">
            <div className="panel-head">
              <div>
                <h2>Payment History</h2>
                <p>Collections recorded against this customer.</p>
              </div>
              <strong>{currency(received)}</strong>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Payment</th>
                    <th>Date</th>
                    <th>Order / Invoice</th>
                    <th>Method</th>
                    <th>Reference</th>
                    <th className="align-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.length === 0 ? (
                    <tr><td colSpan={6} className="empty-cell">No customer payments recorded yet.</td></tr>
                  ) : (
                    payments.map((row: any) => (
                      <tr key={row.id}>
                        <td className="mono">{row.payment_no || "Payment"}</td>
                        <td>{date(row.payment_date)}</td>
                        <td>{[row.order_no, row.invoice_no].filter(Boolean).join(" · ") || "General"}</td>
                        <td>{row.payment_method ? label(row.payment_method) : "Not set"}</td>
                        <td>{row.reference_no || "-"}</td>
                        <td className="align-right"><strong>{currency(row.amount)}</strong></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </article>

          {leads.length > 0 ? (
            <article className="panel">
              <div className="panel-head">
                <div>
                  <h2>Lead History</h2>
                  <p>Original enquiries converted into this customer account.</p>
                </div>
              </div>
              <div className="customer-mini-list">
                {leads.map((row: any) => (
                  <Link href={`/admin/leads/${row.id}`} key={row.id} className="customer-mini-row">
                    <div>
                      <strong>{row.lead_no}</strong>
                      <span>{row.advertising_type || "Advertising enquiry"} · {row.location || "Location not set"}</span>
                    </div>
                    <span className={`status status-${row.status}`}>{label(row.status)}</span>
                  </Link>
                ))}
              </div>
            </article>
          ) : null}
        </section>

        <aside className="customer-side-column">
          <article className="form-card sticky-card">
            <div className="form-section-title">
              <div>
                <h2>Account Status</h2>
                <p>Inactive customers stay in history but cannot be selected for new quotations.</p>
              </div>
            </div>
            <form action={toggleCustomerActive}>
              <input type="hidden" name="customer_id" value={c.id} />
              <input type="hidden" name="next_active" value={c.is_active ? "false" : "true"} />
              <button
                type="submit"
                className={`button button-full ${c.is_active ? "button-danger-soft" : "button-primary"}`}
              >
                {c.is_active ? "Deactivate Customer" : "Reactivate Customer"}
              </button>
            </form>

            <div className="side-divider" />

            <div className="customer-account-summary">
              <div><span>Order Value</span><strong>{currency(orderValue)}</strong></div>
              <div><span>Invoiced</span><strong>{currency(invoiced)}</strong></div>
              <div><span>Received</span><strong>{currency(received)}</strong></div>
              <div><span>Outstanding</span><strong>{currency(outstanding)}</strong></div>
            </div>
          </article>

          <article className="panel activity-panel">
            <div className="panel-head">
              <div>
                <h2>Activity</h2>
                <p>Customer master audit trail.</p>
              </div>
            </div>
            <div className="activity-list">
              {activity.length === 0 ? (
                <div className="empty-state">
                  No customer-profile activity recorded yet.
                </div>
              ) : (
                activity.map((row: any) => (
                  <div className="activity-item" key={row.id}>
                    <span className="activity-dot" />
                    <div>
                      <strong>{row.description}</strong>
                      <span>{row.actor_name || "System"} · {dateTime(row.created_at)}</span>
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
