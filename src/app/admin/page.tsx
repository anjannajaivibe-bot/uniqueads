import Link from "next/link";
import { PageHeader, StatCard, Status } from "@/components/ui";
import { getDashboardMetrics, getRecentOrders } from "@/lib/queries";
import { inr, number, date } from "@/lib/format";
import { requireAppUser } from "@/lib/auth/authorization";
import { ACCESS, roleAllowed } from "@/lib/auth/permissions";

export default async function DashboardPage() {
  const currentUser = await requireAppUser();
  const canSales = roleAllowed(currentUser.role, ACCESS.sales);
  const canField = roleAllowed(currentUser.role, ACCESS.field);
  const canFinance = roleAllowed(currentUser.role, ACCESS.finance);
  const canCommercial =
    canFinance ||
    currentUser.role === "super_admin" ||
    currentUser.role === "operations_manager";

  const [m, orders] = await Promise.all([
    getDashboardMetrics(currentUser),
    canField ? getRecentOrders(currentUser) : Promise.resolve([]),
  ]);

  const completion = Number(m.total_locations) > 0
    ? Math.round((Number(m.completed_locations) / Number(m.total_locations)) * 100)
    : 0;

  return (
    <>
      <PageHeader title="Dashboard" description="Live operating picture across sales, field execution and collections." />
      <section className="stats-grid">
        {canSales ? (
          <>
            <StatCard label="Open Leads" value={number(m.open_leads)} note="Needs follow-up" />
            <StatCard label="Pending Quotations" value={number(m.pending_quotations)} note="Draft or sent" />
          </>
        ) : null}

        {canField ? (
          <>
            <StatCard label="Active Orders" value={number(m.active_orders)} note="Currently executing" />
            <StatCard
              label="Location Completion"
              value={`${completion}%`}
              note={`${number(m.completed_locations)} of ${number(m.total_locations)}`}
            />
          </>
        ) : null}

        {canCommercial ? (
          <StatCard label="Order Value This Month" value={inr(m.month_order_value)} />
        ) : null}

        {canFinance ? (
          <>
            <StatCard label="Customer Outstanding" value={inr(m.customer_outstanding)} />
            <StatCard label="Expenses This Month" value={inr(m.month_expenses)} />
            <StatCard label="Worker Payments This Month" value={inr(m.month_worker_payments)} />
          </>
        ) : null}
      </section>

      {canField ? (
        <section className="panel">
          <div className="panel-head">
            <div><h2>Recent Orders</h2><p>Latest confirmed campaigns and execution status.</p></div>
            <Link href="/admin/orders" className="text-link">View all</Link>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Order</th><th>Customer</th><th>Campaign</th><th>Due</th><th>Progress</th><th>Status</th><th className="align-right">Value</th></tr></thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr><td colSpan={7} className="empty-cell">No active order history is available yet.</td></tr>
                ) : orders.map((o: any) => (
                  <tr key={o.id}>
                    <td className="mono">{o.order_no}</td>
                    <td>{o.company_name}</td>
                    <td>{o.campaign_name}</td>
                    <td>{date(o.due_date)}</td>
                    <td><div className="progress"><span style={{ width: `${o.progress}%` }} /></div><small>{o.progress}%</small></td>
                    <td><Status value={o.status} /></td>
                    <td className="align-right">{inr(o.total_order_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </>
  );
}
