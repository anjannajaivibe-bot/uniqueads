import { PageHeader, StatCard } from "@/components/ui";
import { OrdersTable } from "@/components/orders-table";
import { getOrderCounts, getOrderList } from "@/lib/order-queries";
import { requireAppUser } from "@/lib/auth/authorization";

export const dynamic = "force-dynamic";

function currency(value: unknown) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export default async function OrdersPage() {
  const currentUser = await requireAppUser();
  const [rows, counts] = await Promise.all([
    getOrderList(currentUser),
    getOrderCounts(currentUser),
  ]);

  const safeRows = rows.map((row: any) => ({
    ...row,
    start_date: row.start_date ? new Date(row.start_date).toISOString() : null,
    due_date: row.due_date ? new Date(row.due_date).toISOString() : null,
  }));

  return (
    <>
      <PageHeader
        title="Orders"
        description={currentUser.role === "supervisor" ? "Your assigned campaigns, locations and execution deadlines." : "Plan confirmed campaigns, locations, teams and execution deadlines."}
      />

      <div className="lead-stats">
        <StatCard label="Active Orders" value={Number((counts as any).active_count || 0)} />
        <StatCard
          label="Overdue"
          value={Number((counts as any).overdue_count || 0)}
          note="Requires attention"
        />
        <StatCard
          label="Completed This Month"
          value={Number((counts as any).completed_month_count || 0)}
        />
        <StatCard
          label="Order Value This Month"
          value={currency((counts as any).month_order_value)}
        />
      </div>

      <OrdersTable rows={safeRows as any} />
    </>
  );
}
