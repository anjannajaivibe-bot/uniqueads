import { notFound } from "next/navigation";
import { PrintButton } from "@/components/print-button";
import { ACCESS, requireRoles } from "@/lib/auth/permissions";
import {
  getFinanceCompanySettings,
  getInvoiceById,
  getInvoiceItems,
} from "@/lib/finance-queries";

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

export default async function InvoicePrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRoles(ACCESS.finance);
  const { id } = await params;

  const [invoice, items, settings] = await Promise.all([
    getInvoiceById(id),
    getInvoiceItems(id),
    getFinanceCompanySettings(),
  ]);

  if (!invoice) notFound();

  const i = invoice as any;
  const s = settings as any;

  return (
    <main className="print-document-shell">
      <div className="print-toolbar no-print">
        <a href={`/admin/finance/invoices/${i.id}`} className="button button-secondary">
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
              <p>{s?.legal_name || ""}</p>
              <p>{s?.address || "Outdoor Advertising Operations"}</p>
              <p>{[s?.phone, s?.email, s?.website].filter(Boolean).join(" · ")}</p>
              {s?.gstin ? <p>GSTIN: {s.gstin}</p> : null}
              {s?.pan ? <p>PAN: {s.pan}</p> : null}
            </div>
          </div>
          <div className="quotation-document-title">
            <span>INVOICE</span>
            <strong>{i.invoice_no}</strong>
          </div>
        </header>

        <section className="quotation-document-meta">
          <div>
            <span>Bill To</span>
            <strong>{i.company_name}</strong>
            {i.contact_person ? <p>{i.contact_person}</p> : null}
            {i.phone ? <p>{i.phone}</p> : null}
            {i.email ? <p>{i.email}</p> : null}
            {i.billing_address ? <p>{i.billing_address}</p> : null}
            {[i.city, i.state, i.pincode].filter(Boolean).length > 0 ? (
              <p>{[i.city, i.state, i.pincode].filter(Boolean).join(", ")}</p>
            ) : null}
            {i.gstin ? <p>GSTIN: {i.gstin}</p> : null}
          </div>
          <div>
            <span>Invoice Date</span>
            <strong>{date(i.invoice_date)}</strong>
            <span>Due Date</span>
            <strong>{date(i.due_date)}</strong>
            <span>Order</span>
            <strong>{i.order_no}</strong>
          </div>
        </section>

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
            {items.map((row: any, index: number) => (
              <tr key={row.id}>
                <td>{index + 1}</td>
                <td>{row.description}</td>
                <td className="align-right">{Number(row.quantity)}</td>
                <td>{row.unit || ""}</td>
                <td className="align-right">{currency(row.rate)}</td>
                <td className="align-right">{currency(row.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <section className="quotation-document-bottom">
          <div className="quotation-document-terms">
            {i.payment_terms ? (
              <div>
                <span>Payment Terms</span>
                <p>{i.payment_terms}</p>
              </div>
            ) : null}

            {s?.bank_name || s?.upi_id ? (
              <div>
                <span>Payment Details</span>
                {s?.bank_name ? <p>Bank: {s.bank_name}</p> : null}
                {s?.bank_account_name ? <p>Account Name: {s.bank_account_name}</p> : null}
                {s?.bank_account_number ? <p>Account No: {s.bank_account_number}</p> : null}
                {s?.ifsc_code ? <p>IFSC: {s.ifsc_code}</p> : null}
                {s?.upi_id ? <p>UPI: {s.upi_id}</p> : null}
              </div>
            ) : null}

            {i.notes ? (
              <div>
                <span>Notes</span>
                <p>{i.notes}</p>
              </div>
            ) : null}
          </div>

          <div className="quotation-document-totals">
            <div><span>Subtotal</span><strong>{currency(i.subtotal)}</strong></div>
            {Number(i.discount_amount) > 0 ? (
              <div><span>Discount</span><strong>- {currency(i.discount_amount)}</strong></div>
            ) : null}
            {Number(i.cgst_amount) > 0 ? <div><span>CGST 9%</span><strong>{currency(i.cgst_amount)}</strong></div> : null}
            {Number(i.sgst_amount) > 0 ? <div><span>SGST 9%</span><strong>{currency(i.sgst_amount)}</strong></div> : null}
            {Number(i.igst_amount) > 0 ? <div><span>IGST 18%</span><strong>{currency(i.igst_amount)}</strong></div> : null}
            <div className="document-grand-total">
              <span>Invoice Total</span><strong>{currency(i.total_amount)}</strong>
            </div>
            {Number(i.amount_paid) > 0 ? (
              <>
                <div><span>Paid</span><strong>{currency(i.amount_paid)}</strong></div>
                <div>
                  <span>Balance</span>
                  <strong>
                    {currency(
                      Math.max(0, Number(i.total_amount) - Number(i.amount_paid))
                    )}
                  </strong>
                </div>
              </>
            ) : null}
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

