import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader, Status } from "@/components/ui";
import {
  getQuotationActivity,
  getQuotationById,
  getQuotationItems,
} from "@/lib/quotation-queries";
import {
  convertQuotationToOrder,
  updateQuotationStatus,
} from "../actions";

export const dynamic = "force-dynamic";

function currency(value: unknown) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
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

function contactName(q: any) {
  return (
    q.company_name ||
    q.lead_company_name ||
    q.customer_contact_person ||
    q.lead_contact_person ||
    "Customer"
  );
}

function whatsappHref(q: any) {
  const raw =
    q.customer_whatsapp ||
    q.customer_phone ||
    q.lead_whatsapp ||
    q.lead_phone ||
    "";
  const digits = String(raw).replace(/\D/g, "");
  if (!digits) return null;
  const phone = digits.length === 10 ? `91${digits}` : digits;

  const text = encodeURIComponent(
    `Dear ${contactName(q)}, quotation ${q.quotation_no} from Unique Ads is ready. Total value: ${currency(q.grand_total)}. Valid until: ${date(q.valid_until)}.`
  );

  return `https://wa.me/${phone}?text=${text}`;
}

export default async function QuotationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [quotation, items, activity] = await Promise.all([
    getQuotationById(id),
    getQuotationItems(id),
    getQuotationActivity(id),
  ]);

  if (!quotation) notFound();
  const q = quotation as any;
  const whatsapp = whatsappHref(q);

  return (
    <>
      <PageHeader
        title={q.quotation_no}
        description={`${contactName(q)} · ${date(q.quotation_date)}`}
        action={
          <div className="header-actions">
            <Link href="/admin/quotations" className="button button-secondary">
              Back
            </Link>
            <Link
              href={`/print/quotation/${q.id}`}
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

      <div className="quotation-detail-grid">
        <section className="quote-main-column">
          <article className="panel quotation-summary">
            <div className="quotation-summary-head">
              <div>
                <Status value={q.status} />
                <h2>{contactName(q)}</h2>
                <p>{q.scope_of_work || "Scope of work not recorded."}</p>
              </div>
              <div className="quotation-total-highlight">
                <span>Grand Total</span>
                <strong>{currency(q.grand_total)}</strong>
                <small>Valid until {date(q.valid_until)}</small>
              </div>
            </div>

            <div className="quote-reference-grid">
              <div><span>Quotation Date</span><strong>{date(q.quotation_date)}</strong></div>
              <div><span>Lead</span><strong>{q.lead_no || "Not linked"}</strong></div>
              <div><span>Customer Code</span><strong>{q.customer_code || "Not converted"}</strong></div>
              <div><span>Created By</span><strong>{q.created_by_name || "System"}</strong></div>
            </div>
          </article>

          <article className="panel">
            <div className="panel-head">
              <div>
                <h2>Commercial Items</h2>
                <p>Approved pricing basis for this quotation.</p>
              </div>
            </div>

            <div className="table-wrap">
              <table className="quotation-items-table">
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
                  {items.map((item: any, index: number) => (
                    <tr key={item.id}>
                      <td>{index + 1}</td>
                      <td><strong>{item.description}</strong></td>
                      <td className="align-right">{Number(item.quantity)}</td>
                      <td>{item.unit || ""}</td>
                      <td className="align-right">{currency(item.rate)}</td>
                      <td className="align-right"><strong>{currency(item.amount)}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="quotation-readonly-total">
              <div><span>Subtotal</span><strong>{currency(q.subtotal)}</strong></div>
              {Number(q.discount_amount) > 0 ? (
                <div><span>Discount</span><strong>- {currency(q.discount_amount)}</strong></div>
              ) : null}
              <div><span>Taxable</span><strong>{currency(q.taxable_amount)}</strong></div>
              {Number(q.cgst_amount) > 0 ? (
                <div><span>CGST</span><strong>{currency(q.cgst_amount)}</strong></div>
              ) : null}
              {Number(q.sgst_amount) > 0 ? (
                <div><span>SGST</span><strong>{currency(q.sgst_amount)}</strong></div>
              ) : null}
              {Number(q.igst_amount) > 0 ? (
                <div><span>IGST</span><strong>{currency(q.igst_amount)}</strong></div>
              ) : null}
              <div className="quote-grand-total">
                <span>Grand Total</span><strong>{currency(q.grand_total)}</strong>
              </div>
            </div>
          </article>

          <article className="panel quote-terms-display">
            <div className="panel-head">
              <div>
                <h2>Terms</h2>
                <p>Commercial conditions attached to this offer.</p>
              </div>
            </div>
            <div className="quote-terms-grid">
              <div>
                <span>Payment Terms</span>
                <p>{q.payment_terms || "Not specified."}</p>
              </div>
              <div>
                <span>Terms & Conditions</span>
                <p>{q.terms_and_conditions || "Not specified."}</p>
              </div>
              {q.notes ? (
                <div>
                  <span>Internal Notes</span>
                  <p>{q.notes}</p>
                </div>
              ) : null}
            </div>
          </article>
        </section>

        <aside className="quote-side-column">
          <article className="form-card sticky-card">
            <div className="form-section-title">
              <div>
                <h2>Quotation Status</h2>
                <p>Record the customer decision accurately.</p>
              </div>
            </div>

            {q.status === "converted" ? (
              <div className="conversion-banner success-banner">
                <div>
                  <strong>Converted to Order</strong>
                  <span>This quotation is locked.</span>
                </div>
              </div>
            ) : (
              <form action={updateQuotationStatus}>
                <input type="hidden" name="quotation_id" value={q.id} />
                <label className="stacked-field">
                  <span>Status</span>
                  <select name="status" defaultValue={q.status}>
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="accepted">Accepted</option>
                    <option value="rejected">Rejected</option>
                    <option value="expired">Expired</option>
                  </select>
                </label>
                <button className="button button-primary button-full" type="submit">
                  Update Status
                </button>
              </form>
            )}

            {q.status === "accepted" ? (
              <>
                <div className="side-divider" />
                <div className="form-section-title">
                  <div>
                    <h2>Convert to Order</h2>
                    <p>Carry the approved quotation value directly into operations.</p>
                  </div>
                </div>
                <form action={convertQuotationToOrder}>
                  <input type="hidden" name="quotation_id" value={q.id} />
                  <label className="stacked-field">
                    <span>Campaign Name *</span>
                    <input
                      name="campaign_name"
                      required
                      placeholder="Example: Telangana Wall Branding Campaign"
                    />
                  </label>
                  <label className="stacked-field">
                    <span>Advertising Type</span>
                    <input
                      name="advertising_type"
                      defaultValue={q.lead_advertising_type || ""}
                      placeholder="Wall Painting / Hoardings..."
                    />
                  </label>
                  <label className="stacked-field">
                    <span>Start Date</span>
                    <input name="start_date" type="date" />
                  </label>
                  <label className="stacked-field">
                    <span>Due Date</span>
                    <input name="due_date" type="date" />
                  </label>
                  <label className="stacked-field">
                    <span>Advance Received</span>
                    <input
                      name="advance_received"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0"
                    />
                  </label>
                  <label className="stacked-field">
                    <span>Work Instructions</span>
                    <textarea
                      name="work_instructions"
                      rows={3}
                      defaultValue={q.scope_of_work || ""}
                    />
                  </label>
                  <button className="button button-primary button-full" type="submit">
                    Create Order
                  </button>
                </form>
              </>
            ) : null}
          </article>

          <article className="panel activity-panel">
            <div className="panel-head">
              <div>
                <h2>Activity</h2>
                <p>Quotation audit trail.</p>
              </div>
            </div>
            <div className="activity-list">
              {activity.length === 0 ? (
                <div className="empty-state">No quotation activity yet.</div>
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
