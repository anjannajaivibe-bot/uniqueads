import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { sql } from "@/lib/db";
import { addWorkerPayment } from "./actions";

export const dynamic = "force-dynamic";

export default async function WorkerPaymentsPage() {
  const [workers, orders, payments] = await Promise.all([
    sql`SELECT id, worker_code, name FROM workers WHERE is_active = true ORDER BY name LIMIT 1000`,
    sql`SELECT id, order_no, campaign_name FROM orders WHERE status <> 'cancelled' ORDER BY created_at DESC LIMIT 500`,
    sql`SELECT wp.id, wp.payment_no, wp.payment_date, wp.payment_type, wp.amount, wp.payment_method,
      wp.reference_no, wp.created_at, w.name AS worker_name, o.order_no, u.full_name AS paid_by_name
      FROM worker_payments wp JOIN workers w ON w.id = wp.worker_id
      LEFT JOIN orders o ON o.id = wp.order_id
      LEFT JOIN app_users u ON u.id = wp.paid_by
      ORDER BY wp.payment_date DESC, wp.created_at DESC LIMIT 100`
  ]);
  return (
    <>
      <PageHeader title="Subcontractor Payments" description="Pay approved subcontract work based on verified live GPS photos and agreed sq.ft value. Advances remain available within allocated budget."
        action={<Link href="/admin/finance" className="button button-secondary">Back to Finance</Link>} />
      <section className="form-card">
        <div className="form-section-title"><div><h2>Record Subcontractor Payment</h2><p>Progress payments require verified work. Final settlements require every allocated location to be verified.</p></div></div>
        <form action={addWorkerPayment}>
          <div className="form-grid">
            <label><span>Subcontractor *</span><select name="worker_id" required defaultValue=""><option value="">Select worker</option>{workers.map((w: any) => <option key={w.id} value={w.id}>{w.worker_code ? `${w.worker_code} · ${w.name}` : w.name}</option>)}</select></label>
            <label><span>Payment Date *</span><input type="date" name="payment_date" required defaultValue={new Date().toISOString().slice(0,10)}/></label>
            <label><span>Payment Type *</span><select name="payment_type" required defaultValue="progress"><option value="advance">Advance</option><option value="progress">Progress</option><option value="final">Final</option><option value="adjustment">Adjustment</option></select></label>
            <label><span>Amount *</span><input type="number" name="amount" min="0.01" step="0.01" required /></label>
            <label><span>Payment Method</span><select name="payment_method" defaultValue=""><option value="">Select method</option><option value="cash">Cash</option><option value="bank_transfer">Bank Transfer</option><option value="upi">UPI</option><option value="cheque">Cheque</option><option value="other">Other</option></select></label>
            <label><span>Work Order *</span><select name="order_id" required defaultValue=""><option value="">Select allocated work order</option>{orders.map((o: any) => <option key={o.id} value={o.id}>{o.order_no} · {o.campaign_name}</option>)}</select></label>
            <label><span>Reference Number</span><input name="reference_no" placeholder="UPI, bank or cheque reference"/></label>
            <label className="full"><span>Notes</span><textarea name="notes" rows={2}/></label>
          </div>
          <div className="form-actions"><button type="submit" className="button button-primary">Record Subcontractor Payment</button></div>
        </form>
      </section>
      <section className="panel" style={{marginTop:24}}>
        <div className="panel-head"><div><h2>Recent Subcontractor Payments</h2><p>Latest 100 payouts with payment date, entry staff and recorded amount.</p></div></div>
        <div className="table-wrap"><table><thead><tr><th>Payment</th><th>Date</th><th>Worker</th><th>Type</th><th>Order</th><th>Entered By</th><th>Recorded At (IST)</th><th className="align-right">Amount</th></tr></thead>
          <tbody>{payments.length === 0 ? <tr><td colSpan={8} className="empty-cell">No subcontractor payments recorded.</td></tr> : payments.map((p: any) =>
            <tr key={p.id}><td className="mono">{p.payment_no}</td><td>{String(p.payment_date).slice(0,10)}</td><td>{p.worker_name}</td><td>{p.payment_type}</td><td>{p.order_no || "General"}</td><td>{p.paid_by_name || "Unknown"}</td><td>{new Intl.DateTimeFormat("en-IN",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Kolkata"}).format(new Date(p.created_at))}</td><td className="align-right">{new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR"}).format(Number(p.amount))}</td></tr>)}</tbody>
        </table></div>
      </section>
    </>
  );
}
