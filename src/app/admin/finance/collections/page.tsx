import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { sql } from "@/lib/db";
import { ACCESS, requireRoles } from "@/lib/auth/permissions";
import { recordCompanyReceipt } from "./actions";

export const dynamic = "force-dynamic";

function money(value: unknown) {
  return new Intl.NumberFormat("en-IN", {style: "currency", currency:"INR", maximumFractionDigits: 2}).format(Number(value || 0));
}
function stamp(value: unknown) {
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? "-" : new Intl.DateTimeFormat("en-IN",{
    day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit",timeZone:"Asia/Kolkata"
  }).format(d);
}

export default async function CompanyCollectionsPage({searchParams}: {
  searchParams: Promise<{order?: string; saved?: string}>;
}) {
  await requireRoles(ACCESS.finance);
  const params = await searchParams;
  const [orders, receipts] = await Promise.all([
    sql`SELECT o.id,o.order_no,o.client_work_order_no,o.client_invoice_no,
        o.entity_code,o.total_order_amount,o.contract_area_sqft,o.client_rate_per_sqft,
        o.status,c.company_name,COALESCE(pay.received,0) AS received,
        GREATEST(0,o.total_order_amount-COALESCE(pay.received,0)) AS outstanding
      FROM orders o JOIN customers c ON c.id=o.customer_id
      LEFT JOIN LATERAL (
        SELECT sum(amount) AS received FROM customer_payments WHERE order_id=o.id
      ) pay ON true
      ORDER BY o.created_at DESC LIMIT 500`,
    sql`SELECT p.id,p.payment_no,p.amount,p.payment_date,p.created_at,p.payment_method,
        p.reference_no,o.order_no,o.client_work_order_no,o.entity_code,c.company_name,
        u.full_name AS entered_by
      FROM customer_payments p JOIN orders o ON o.id=p.order_id
      JOIN customers c ON c.id=p.customer_id
      LEFT JOIN app_users u ON u.id=p.received_by
      ORDER BY p.created_at DESC LIMIT 200`
  ]);
  const selected = orders.find((row: any) => row.id === params.order) as any;
  return (
    <>
      <PageHeader title="Company Collections" description="Record payments against company work orders, with server timestamps, references and settlement balances."
        action={<Link href="/admin/finance" className="button button-secondary">Back to Finance</Link>} />
      {params.saved === "1" ? <p role="status" className="status status-completed">Payment recorded successfully.</p> : null}
      <section className="form-card">
        <div className="form-section-title"><div><h2>Receive Company Payment</h2>
          <p>Choose the originating work order. Receipts cannot exceed its outstanding balance.</p></div></div>
        <form action={recordCompanyReceipt} className="form-grid">
          <label className="full"><span>Company Work Order *</span>
            <select name="order_id" required defaultValue={selected?.id || ""}>
              <option value="">Select work order</option>
              {orders.filter((o:any)=>o.status !== "cancelled").map((o:any)=>
                <option value={o.id} key={o.id}>{o.company_name} | {o.order_no} | {o.client_work_order_no || "No external reference"} | {o.entity_code === "unique_advertisers" ? "Unique Advertisers" : "Unique Ads"} | Balance {money(o.outstanding)}</option>)}
            </select>
          </label>
          {selected ? <div className="full" style={{padding:12,background:"#f4f7fa",borderRadius:10}}>
            <strong>{selected.entity_code === "unique_advertisers" ? "Unique Advertisers" : "Unique Ads"}</strong>
            <p>Company work order: {selected.client_work_order_no || "-"} · Company invoice: {selected.client_invoice_no || "-"}</p>
            <p>Value {money(selected.total_order_amount)} · Received {money(selected.received)} · <strong>Outstanding {money(selected.outstanding)}</strong></p>
          </div> : null}
          <label><span>Amount Received (₹) *</span><input name="amount" type="number" min="0.01" step="0.01" required /></label>
          <label><span>Payment Date</span><input type="date" name="payment_date" /></label>
          <label><span>Payment Method</span><select name="payment_method" defaultValue="">
            <option value="">Not specified</option><option value="bank_transfer">Bank Transfer</option>
            <option value="upi">UPI</option><option value="cash">Cash</option>
            <option value="cheque">Cheque</option><option value="card">Card</option><option value="other">Other</option>
          </select></label>
          <label><span>Bank / UPI Reference</span><input name="reference_no" placeholder="Transaction reference" /></label>
          <label className="full"><span>Notes</span><textarea name="notes" rows={2}/></label>
          <div className="form-actions full"><button type="submit" className="button button-primary">Record Receipt</button></div>
        </form>
      </section>
      <section className="panel" style={{marginTop:24}}>
        <div className="panel-head"><div><h2>Company Work Order Balances</h2><p>Outstanding across the last 500 work orders, separated by receiving entity.</p></div></div>
        <div className="table-wrap"><table><thead><tr>
          <th>Company</th><th>Entity</th><th>Company WO / ERP</th><th className="align-right">Order Value</th>
          <th className="align-right">Received</th><th className="align-right">Balance</th>
        </tr></thead><tbody>
          {orders.map((o:any)=><tr key={o.id}>
            <td>{o.company_name}</td>
            <td>{o.entity_code==="unique_advertisers" ? "Unique Advertisers":"Unique Ads"}</td>
            <td><Link href={`/admin/orders/${o.id}`}>{o.client_work_order_no || o.order_no}</Link></td>
            <td className="align-right">{money(o.total_order_amount)}</td>
            <td className="align-right">{money(o.received)}</td>
            <td className="align-right"><strong>{money(o.outstanding)}</strong></td>
          </tr>)}
        </tbody></table></div>
      </section>
      <section className="panel" style={{marginTop:24}}>
        <div className="panel-head"><div><h2>Receipt Audit Trail</h2><p>Server entry time is retained independently of the payment date.</p></div></div>
        <div className="table-wrap"><table><thead><tr>
          <th>Receipt / Company WO</th><th>Entity</th><th>Payment Date</th><th>Entered At (IST)</th><th>Entered By</th><th>Reference</th><th className="align-right">Amount</th>
        </tr></thead><tbody>
          {receipts.length===0?<tr><td colSpan={7}>No receipts recorded yet.</td></tr>:receipts.map((r:any)=><tr key={r.id}>
            <td>{r.payment_no || "-"}<div>{r.client_work_order_no || r.order_no}</div></td>
            <td>{r.entity_code==="unique_advertisers" ? "Unique Advertisers":"Unique Ads"}</td>
            <td>{String(r.payment_date).slice(0,10)}</td>
            <td>{stamp(r.created_at)}</td>
            <td>{r.entered_by || "-"}</td><td>{r.reference_no || "-"}</td>
            <td className="align-right">{money(r.amount)}</td>
          </tr>)}
        </tbody></table></div>
      </section>
    </>
  );
}
