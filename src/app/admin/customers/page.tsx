import Link from "next/link";
import { PageHeader, StatCard } from "@/components/ui";
import { CustomersTable } from "@/components/customers-table";
import { getCustomerCounts, getCustomerList } from "@/lib/customer-queries";

export const dynamic = "force-dynamic";

function currency(value: unknown) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export default async function CustomersPage() {
  const [rows, counts] = await Promise.all([
    getCustomerList(),
    getCustomerCounts(),
  ]);

  const invoiceTotal = Number((counts as any).invoice_total || 0);
  const receivedTotal = Number((counts as any).received_total || 0);

  return (
    <>
      <PageHeader
        title="Customers"
        description="Customer master, commercial history, orders, invoices and collections in one account view."
        action={
          <Link href="/admin/customers/new" className="button button-primary">
            + Add Customer
          </Link>
        }
      />

      <div className="lead-stats">
        <StatCard label="Active Customers" value={Number((counts as any).active_count || 0)} />
        <StatCard label="GST Customers" value={Number((counts as any).gst_count || 0)} />
        <StatCard label="Total Invoiced" value={currency(invoiceTotal)} />
        <StatCard
          label="Outstanding"
          value={currency(Math.max(0, invoiceTotal - receivedTotal))}
          note={`Received ${currency(receivedTotal)}`}
        />
      </div>

      <CustomersTable rows={rows as any} />
    </>
  );
}
