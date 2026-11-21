import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { getQuotationCustomers } from "@/lib/quotation-queries";
import { createWorkOrder } from "../actions";
import { requireRoles, ACCESS } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

export default async function NewWorkOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ customer?: string }>;
}) {
  await requireRoles(ACCESS.operations);
  const { customer } = await searchParams;
  const customers = await getQuotationCustomers();
  return (
    <>
      <PageHeader
        title="New Work Order"
        description="Record confirmed advertising work directly. No lead or quotation is required."
        action={<Link href="/admin/orders" className="button button-secondary">Back to Work Orders</Link>}
      />
      <form action={createWorkOrder} className="form-card">
        <div className="form-section-title">
          <div><h2>Customer & Work Details</h2><p>Register the customer first if they are not yet listed.</p></div>
        </div>
        <div className="form-grid">
          <label>
            <span>Customer *</span>
            <select name="customer_id" defaultValue={customer || ""} required>
              <option value="">Choose customer</option>
              {customers.map((row: any) => (
                <option key={row.id} value={row.id}>{row.company_name}</option>
              ))}
            </select>
            <Link className="text-link" href="/admin/customers/new">+ Add Customer</Link>
          </label>
          <label>
            <span>Campaign / Work Name *</span>
            <input name="campaign_name" placeholder="e.g. Wall painting campaign at Hyderabad" required maxLength={180} />
          </label>
          <label>
            <span>Advertising Type</span>
            <select name="advertising_type" defaultValue="">
              <option value="">Select type</option>
              <option value="Wall Painting">Wall Painting</option>
              <option value="Hoardings">Hoardings</option>
              <option value="Outdoor Advertising">Outdoor Advertising</option>
              <option value="Rural Advertising">Rural Advertising</option>
              <option value="Other">Other</option>
            </select>
          </label>
          <label>
            <span>Work Order Value (₹) *</span>
            <input type="number" name="total_order_amount" min="0" step="0.01" defaultValue="0" required />
          </label>
          <label>
            <span>Advance Received (₹)</span>
            <input type="number" name="advance_received" min="0" step="0.01" defaultValue="0" />
          </label>
          <label>
            <span>Start Date</span>
            <input type="date" name="start_date" />
          </label>
          <label>
            <span>Due Date</span>
            <input type="date" name="due_date" />
          </label>
          <label className="full">
            <span>Instructions & Specifications</span>
            <textarea name="work_instructions" rows={4} placeholder="Wall sizes, artwork instructions, materials, execution notes and other requirements." />
          </label>
        </div>
        <div className="form-actions">
          <button type="submit" className="button button-primary">Create Work Order</button>
        </div>
      </form>
    </>
  );
}
