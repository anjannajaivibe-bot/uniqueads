import Link from "next/link";
import { PageHeader, StatCard, Status } from "@/components/ui";
import { requireAppUser } from "@/lib/auth/authorization";
import { getDashboardMetrics, getRecentOrdersForUser } from "@/lib/queries";
import { inr, number, date } from "@/lib/format";

type Action = {
  href: string;
  title: string;
  note: string;
};

function dashboardActions(role: string): Action[] {
  if (role === "super_admin") {
    return [
      { href: "/admin/leads/new", title: "Add Lead", note: "Capture a new enquiry" },
      { href: "/admin/quotations/new", title: "New Quotation", note: "Prepare a commercial offer" },
      { href: "/admin/orders", title: "Orders", note: "Plan campaign execution" },
      { href: "/admin/work-progress/live-capture", title: "Live Capture", note: "Camera + GPS work proof" },
      { href: "/admin/finance", title: "Finance", note: "Invoices, collections and expenses" },
      { href: "/admin/reports", title: "Reports", note: "Performance and profitability" },
    ];
  }

  if (role === "operations_manager") {
    return [
      { href: "/admin/leads/new", title: "Add Lead", note: "Capture a new enquiry" },
      { href: "/admin/orders", title: "Orders", note: "Plan and assign campaigns" },
      { href: "/admin/work-progress", title: "Work Progress", note: "Track field execution" },
      { href: "/admin/work-progress/live-capture", title: "Live Capture", note: "Camera + GPS work proof" },
      { href: "/admin/workers", title: "Workers", note: "Teams and assignments" },
      { href: "/admin/reports", title: "Reports", note: "Operational performance" },
    ];
  }

  if (role === "sales") {
    return [
      { href: "/admin/leads/new", title: "Add Lead", note: "Capture a new enquiry" },
      { href: "/admin/leads", title: "Follow-ups", note: "Work your active pipeline" },
      { href: "/admin/quotations/new", title: "New Quotation", note: "Prepare an offer" },
      { href: "/admin/customers", title: "Customers", note: "Commercial history" },
    ];
  }

  if (role === "supervisor") {
    return [
      { href: "/admin/work-progress/live-capture", title: "Live Capture", note: "Capture camera + GPS proof" },
      { href: "/admin/work-progress", title: "Assigned Work", note: "Track your active locations" },
      { href: "/admin/orders", title: "Assigned Orders", note: "Review campaign details" },
    ];
  }

  return [
    { href: "/admin/finance", title: "Finance", note: "Invoices, payments and expenses" },
    { href: "/admin/reports", title: "Reports", note: "Collections and profitability" },
  ];
}

export default async function DashboardPage() {
  const currentUser = await requireAppUser();
  const [m, orders] = await Promise.all([
    getDashboardMetrics(),
    getRecentOrdersForUser(currentUser),
  ]);

  const completion = Number(m.total_locations) > 0
    ? Math.round((Number(m.completed_locations) / Number(m.total_locations)) * 100)
    : 0;

  const role = currentUser.role;
  const showSales = ["super_admin", "operations_manager", "sales"].includes(role);
  const showField = ["super_admin", "operations_manager", "supervisor"].includes(role);
  const showOperationsValue = ["super_admin", "operations_manager", "accounts"].includes(role);
  const showFinance = ["super_admin", "accounts"].includes(role);
  const actions = dashboardActions(role);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`Welcome, ${currentUser.full_name}. Your operational view is tailored to your access.`}
      />

      <section className="stats-grid">
        {showSales ? (
          <>
            <StatCard label="Open Leads" value={number(m.open_leads)} note="Needs follow-up" />
            <StatCard label="Pending Quotations" value={number(m.pending_quotations)} note="Draft or sent" />
          </>
        ) : null}

        {showField ? (
          <>
            <StatCard label="Active Orders" value={number(m.active_orders)} note="Currently executing" />
            <StatCard
              label="Location Completion"
              value={`${completion}%`}
              note={`${number(m.completed_locations)} of ${number(m.total_locations)}`}
            />
          </>
        ) : null}

        {showOperationsValue ? (
          <StatCard label="Order Value This Month" value={inr(m.month_order_value)} />
        ) : null}

        {showFinance ? (
          <>
            <StatCard label="Customer Outstanding" value={inr(m.customer_outstanding)} />
            <StatCard label="Expenses This Month" value={inr(m.month_expenses)} />
            <StatCard label="Worker Payments This Month" value={inr(m.month_worker_payments)} />
          </>
        ) : null}
      </section>

      <section className="panel dashboard-actions">
        <div className="panel-head">
          <div>
            <h2>Quick Actions</h2>
            <p>Go directly to the tasks available for your role.</p>
          </div>
        </div>
        <div className="dashboard-action-grid">
          {actions.map((action) => (
            <Link href={action.href} className="dashboard-action-card" key={action.href}>
              <div>
                <strong>{action.title}</strong>
                <span>{action.note}</span>
              </div>
              <b aria-hidden="true">→</b>
            </Link>
          ))}
        </div>
      </section>

      {showField ? (
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>{role === "supervisor" ? "My Recent Orders" : "Recent Orders"}</h2>
              <p>
                {role === "supervisor"
                  ? "Orders assigned to you or your linked worker profile."
                  : "Latest confirmed campaigns and execution status."}
              </p>
            </div>
            <Link href="/admin/orders" className="text-link">View all</Link>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Campaign</th>
                  <th>Due</th>
                  <th>Progress</th>
                  <th>Status</th>
                  <th className="align-right">Value</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="empty-cell">
                      No assigned orders are available yet.
                    </td>
                  </tr>
                ) : (
                  orders.map((o: any) => (
                    <tr key={o.id}>
                      <td>
                        <Link href={`/admin/orders/${o.id}`} className="mono">
                          {o.order_no}
                        </Link>
                      </td>
                      <td>{o.company_name}</td>
                      <td>{o.campaign_name}</td>
                      <td>{date(o.due_date)}</td>
                      <td>
                        <div className="progress">
                          <span style={{ width: `${o.progress}%` }} />
                        </div>
                        <small>{o.progress}%</small>
                      </td>
                      <td><Status value={o.status} /></td>
                      <td className="align-right">{inr(o.total_order_amount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </>
  );
}
