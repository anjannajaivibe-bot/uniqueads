import { notFound } from "next/navigation";
import { PrintButton } from "@/components/print-button";
import { ACCESS, requireRoles } from "@/lib/auth/permissions";
import {
  getCompanySettings,
  getQuotationById,
  getQuotationItems,
} from "@/lib/quotation-queries";

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

export default async function QuotationPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRoles(ACCESS.sales);
  const { id } = await params;

  const [quotation, items, settings] = await Promise.all([
    getQuotationById(id),
    getQuotationItems(id),
    getCompanySettings(),
  ]);

  if (!quotation) notFound();
  const q = quotation as any;
  const s = settings as any;

  const clientName =
    q.company_name ||
    q.lead_company_name ||
    q.customer_contact_person ||
    q.lead_contact_person ||
    "Customer";

  const clientContact =
    q.customer_contact_person || q.lead_contact_person || "";

  const clientPhone =
    q.customer_phone || q.lead_phone || "";

  const clientEmail =
    q.customer_email || q.lead_email || "";

  return (
    <main className="print-document-shell">
      <div className="print-toolbar no-print">
        <a href={`/admin/quotations/${q.id}`} className="button button-secondary">
          Back
        </a>
        <PrintButton />
      </div>

      <article className="quotation-document">
        <header className="quotation-document-head">
          <div className="quotation-document-brand">
            <img src="/unique-ads-logo.png" alt="Unique Ads" />
            <div>
              <h1>{s?.company_name || "Unique Ads"}</h1>
              <p>{s?.address || "Outdoor Advertising Operations"}</p>
              <p>
                {[s?.phone, s?.email, s?.website].filter(Boolean).join(" · ")}
              </p>
              {s?.gstin ? <p>GSTIN: {s.gstin}</p> : null}
            </div>
          </div>
          <div className="quotation-document-title">
            <span>QUOTATION</span>
            <strong>{q.quotation_no}</strong>
          </div>
        </header>

        <section className="quotation-document-meta">
          <div>
            <span>Quotation To</span>
            <strong>{clientName}</strong>
            {clientContact && clientContact !== clientName ? <p>{clientContact}</p> : null}
            {clientPhone ? <p>{clientPhone}</p> : null}
            {clientEmail ? <p>{clientEmail}</p> : null}
            {q.billing_address ? <p>{q.billing_address}</p> : null}
          </div>
          <div>
            <span>Quotation Date</span>
            <strong>{date(q.quotation_date)}</strong>
            <span>Valid Until</span>
            <strong>{date(q.valid_until)}</strong>
          </div>
        </section>

        {q.scope_of_work ? (
          <section className="quotation-document-scope">
            <span>Scope of Work</span>
            <p>{q.scope_of_work}</p>
          </section>
        ) : null}

        <table className="quotation-document-table">
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
                <td>{item.description}</td>
                <td className="align-right">{Number(item.quantity)}</td>
                <td>{item.unit || ""}</td>
                <td className="align-right">{currency(item.rate)}</td>
                <td className="align-right">{currency(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <section className="quotation-document-bottom">
          <div className="quotation-document-terms">
            {q.payment_terms ? (
              <div>
                <span>Payment Terms</span>
                <p>{q.payment_terms}</p>
              </div>
            ) : null}
            {q.terms_and_conditions ? (
              <div>
                <span>Terms & Conditions</span>
                <p>{q.terms_and_conditions}</p>
              </div>
            ) : null}
          </div>

          <div className="quotation-document-totals">
            <div><span>Subtotal</span><strong>{currency(q.subtotal)}</strong></div>
            {Number(q.discount_amount) > 0 ? (
              <div><span>Discount</span><strong>- {currency(q.discount_amount)}</strong></div>
            ) : null}
            {Number(q.cgst_amount) > 0 ? (
              <div><span>CGST 9%</span><strong>{currency(q.cgst_amount)}</strong></div>
            ) : null}
            {Number(q.sgst_amount) > 0 ? (
              <div><span>SGST 9%</span><strong>{currency(q.sgst_amount)}</strong></div>
            ) : null}
            {Number(q.igst_amount) > 0 ? (
              <div><span>IGST 18%</span><strong>{currency(q.igst_amount)}</strong></div>
            ) : null}
            <div className="document-grand-total">
              <span>Grand Total</span><strong>{currency(q.grand_total)}</strong>
            </div>
          </div>
        </section>

        <footer className="quotation-document-footer">
          <div>
            <strong>{s?.company_name || "Unique Ads"}</strong>
            <span>Branding That Gets Noticed</span>
          </div>
          <div className="quotation-signature">
            <span>Authorised Signatory</span>
          </div>
        </footer>
      </article>
    </main>
  );
}

