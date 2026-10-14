import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader, Status } from "@/components/ui";
import {
  getInvoiceActivity,
  getInvoiceById,
  getInvoiceItems,
  getInvoicePayments,
} from "@/lib/finance-queries";
import {
  recordCustomerPayment,
  updateInvoiceStatus,
} from "../../actions";

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

function whatsappHref(invoice: any) {
  const digits = String(invoice.whatsapp || invoice.phone || "").replace(/\D/g, "");
  if (!digits) return null;
  const phone = digits.length === 10 ? `91${digits}` : digits;
  const balance = Math.max(
    0,
    Number(invoice.total_amount) - Number(invoice.amount_paid)
  );

  const message = encodeURIComponent(
    `Dear ${invoice.contact_person || invoice.company_name}, invoice ${invoice.invoice_no} from Unique Ads is ready. Invoice amount: ${currency(invoice.total_amount)}. Outstanding: ${currency(balance)}. Due date: ${date(invoice.due_date)}.`
  );

  return `https://wa.me/${phone}?text=${message}`;
}

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [invoice, items, payments, activity] = await Promise.all([
    getInvoiceById(id),
    getInvoiceItems(id),
    getInvoicePayments(id),
    getInvoiceActivity(id),
  ]);

  if (!invoice) notFound();
  const i = invoice as any;

  const balance = Math.max(
    0,
    Number(i.total_amount) - Number(i.amount_paid)
  );
  const whatsapp = whatsappHref(i);

  return (
    <>
      <PageHeader
        title={i.invoice_no}
        description={`${i.company_name} · ${i.order_no} · ${i.campaign_name}`}
        action={
          <div className="header-actions">
            <Link href="/admin/finance" className="button button-secondary">
              Back to Finance
            </Link>
            <Link
              href={`/print/invoice/${i.id}`}
              target="_blank"
              className="button button-secondary"
            >
              Print / Save PDF
            </Link>
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

      <section className="panel invoice-hero">
        <div className="invoice-hero-head">
          <div>
            <Status value={i.status} />
            <h2>{i.company_name}</h2>
            <p>{i.contact_person || "Customer"} · {i.phone || "No phone"}</p>
          </div>
          <div className="invoice-balance-box">
            <span>Outstanding</span>
            <strong>{currency(balance)}</strong>
            <small>
              Paid {currency(i.amount_paid)} of {currency(i.total_amount)}
            </small>
          </div>
        </div>

        <div className="lead-facts invoice-facts">
          <div><span>Invoice Date</span><strong>{date(i.invoice_date)}</strong></div>
          <div><span>Due Date</span><strong>{date(i.due_date)}</strong></div>
          <div><span>Order</span><strong>{i.order_no}</strong></div>
          <div><span>GSTIN</span><strong>{i.gstin || "Not set"}</strong></div>
          <div><span>Created By</span><strong>{i.created_by_name || "System"}</strong></div>
        </div>
      </section>

      <div className="invoice-detail-grid">
        <section className="invoice-main-column">
          <article className="panel">
            <div className="panel-head">
              <div>
                <h2>Invoice Items</h2>
                <p>Commercial billing details.</p>
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Description</th>
                    <th className="align-right">Qty</th>
                    <th>Unit</th>
                    <th className="align-right">Rate</th>
                    <th className="align-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row: any, index: number) => (
                    <tr key={row.id}>
                      <td>{index + 1}</td>
                      <td><strong>{row.description}</strong></td>
                      <td className="align-right">{Number(row.quantity)}</td>
                      <td>{row.unit || ""}</td>
                      <td className="align-right">{currency(row.rate)}</td>
                      <td className="align-right"><strong>{currency(row.amount)}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="quotation-readonly-total">
              <div><span>Subtotal</span><strong>{currency(i.subtotal)}</strong></div>
              {Number(i.discount_amount) > 0 ? (
                <div><span>Discount</span><strong>- {currency(i.discount_amount)}</strong></div>
              ) : null}
              <div><span>Taxable</span><strong>{currency(i.taxable_amount)}</strong></div>
              {Number(i.cgst_amount) > 0 ? <div><span>CGST</span><strong>{currency(i.cgst_amount)}</strong></div> : null}
              {Number(i.sgst_amount) > 0 ? <div><span>SGST</span><strong>{currency(i.sgst_amount)}</strong></div> : null}
              {Number(i.igst_amount) > 0 ? <div><span>IGST</span><strong>{currency(i.igst_amount)}</strong></div> : null}
              <div className="quote-grand-total">
                <span>Invoice Total</span><strong>{currency(i.total_amount)}</strong>
              </div>
            </div>
          </article>

          <article className="panel">
            <div className="panel-head">
              <div>
                <h2>Payment History</h2>
                <p>Receipts recorded against this invoice.</p>
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Receipt</th>
                    <th>Date</th>
                    <th>Method</th>
                    <th>Reference</th>
                    <th>Received By</th>
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
                    payments.map((row: any) => (
                      <tr key={row.id}>
                        <td className="mono">{row.payment_no || "Receipt"}</td>
                        <td>{date(row.payment_date)}</td>
                        <td>{row.payment_method ? label(row.payment_method) : "Not set"}</td>
                        <td>{row.reference_no || "-"}</td>
                        <td>{row.received_by_name || "System"}</td>
                        <td className="align-right"><strong>{currency(row.amount)}</strong></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </article>
        </section>

        <aside className="invoice-side-column">
          <article className="form-card sticky-card">
            <div className="form-section-title">
              <div>
                <h2>Invoice Status</h2>
                <p>Issue the invoice when it is ready to send to the customer.</p>
              </div>
            </div>

            {["paid", "partially_paid"].includes(i.status) ? (
              <div className="conversion-banner success-banner">
                <div>
                  <strong>{label(i.status)}</strong>
                  <span>Payment status is maintained automatically.</span>
                </div>
              </div>
            ) : (
              <form action={updateInvoiceStatus}>
                <input type="hidden" name="invoice_id" value={i.id} />
                <label className="stacked-field">
                  <span>Status</span>
                  <select name="status" defaultValue={i.status}>
                    <option value="draft">Draft</option>
                    <option value="issued">Issued</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </label>
                <button type="submit" className="button button-primary button-full">
                  Update Status
                </button>
              </form>
            )}

            {balance > 0 && i.status !== "cancelled" ? (
              <>
                <div className="side-divider" />
                <div className="form-section-title">
                  <div>
                    <h2>Record Collection</h2>
                    <p>Outstanding: {currency(balance)}</p>
                  </div>
                </div>
                <form action={recordCustomerPayment}>
                  <input type="hidden" name="invoice_id" value={i.id} />
                  <label className="stacked-field">
                    <span>Payment Date *</span>
                    <input
                      name="payment_date"
                      type="date"
                      required
                      defaultValue={new Date().toISOString().slice(0, 10)}
                    />
                  </label>
                  <label className="stacked-field">
                    <span>Amount *</span>
                    <input
                      name="amount"
                      type="number"
                      min="0.01"
                      max={balance}
                      step="0.01"
                      required
                    />
                  </label>
                  <label className="stacked-field">
                    <span>Method</span>
                    <select name="payment_method" defaultValue="">
                      <option value="">Select</option>
                      <option value="cash">Cash</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="upi">UPI</option>
                      <option value="cheque">Cheque</option>
                      <option value="card">Card</option>
                      <option value="other">Other</option>
                    </select>
                  </label>
                  <label className="stacked-field">
                    <span>Reference</span>
                    <input name="reference_no" />
                  </label>
                  <label className="stacked-field">
                    <span>Notes</span>
                    <textarea name="notes" rows={2} />
                  </label>
                  <button type="submit" className="button button-primary button-full">
                    Record Payment
                  </button>
                </form>
              </>
            ) : null}
          </article>

          <article className="panel activity-panel">
            <div className="panel-head">
              <div>
                <h2>Activity</h2>
                <p>Invoice and collection audit trail.</p>
              </div>
            </div>
            <div className="activity-list">
              {activity.length === 0 ? (
                <div className="empty-state">No invoice activity yet.</div>
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
