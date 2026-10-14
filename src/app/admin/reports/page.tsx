import Link from "next/link";
import { PageHeader, StatCard } from "@/components/ui";
import {
  getCustomerOutstandingReport,
  getExecutiveReport,
  getExpenseBreakdown,
  getMonthlyPerformance,
  getOrderProfitabilityReport,
  getOverdueInvoicesReport,
  getSalesFunnel,
  getStatePerformance,
  getWorkerPaymentReport,
} from "@/lib/report-queries";

export const dynamic = "force-dynamic";

function label(value: string | null | undefined) {
  return String(value ?? "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function currency(value: unknown) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
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

function validDate(value?: string) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const params = await searchParams;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const defaultFrom = monthStart.toISOString().slice(0, 10);
  const defaultTo = now.toISOString().slice(0, 10);

  const from = validDate(params.from) ? params.from! : defaultFrom;
  const to = validDate(params.to) ? params.to! : defaultTo;

  const range = from <= to ? { from, to } : { from: to, to: from };

  const [
    executive,
    funnel,
    monthly,
    expenses,
    outstanding,
    profitability,
    states,
    workerPayments,
    overdueInvoices,
  ] = await Promise.all([
    getExecutiveReport(range),
    getSalesFunnel(range),
    getMonthlyPerformance(),
    getExpenseBreakdown(range),
    getCustomerOutstandingReport(),
    getOrderProfitabilityReport(range),
    getStatePerformance(range),
    getWorkerPaymentReport(range),
    getOverdueInvoicesReport(),
  ]);

  const e = executive as any;
  const leadsCreated = Number(e.leads_created || 0);
  const leadsWon = Number(e.leads_won || 0);
  const conversion = leadsCreated > 0 ? (leadsWon / leadsCreated) * 100 : 0;
  const orderValue = Number(e.order_value || 0);
  const expensesValue = Number(e.expense_value || 0);
  const workerValue = Number(e.worker_payment_value || 0);
  const profit = orderValue - expensesValue - workerValue;
  const margin = orderValue > 0 ? (profit / orderValue) * 100 : 0;

  const funnelMax = Math.max(
    1,
    ...funnel.map((row: any) => Number(row.count || 0))
  );

  const monthlyMax = Math.max(
    1,
    ...monthly.map((row: any) =>
      Math.max(
        Number(row.order_value || 0),
        Number(row.collections || 0),
        Number(row.expenses || 0) + Number(row.worker_payments || 0)
      )
    )
  );

  return (
    <>
      <PageHeader
        title="Reports"
        description="Management view of sales, revenue, collections, execution costs and profitability."
      />

      <section className="panel report-filter-panel">
        <form method="get" className="report-filter-form">
          <label>
            <span>From</span>
            <input name="from" type="date" defaultValue={range.from} />
          </label>
          <label>
            <span>To</span>
            <input name="to" type="date" defaultValue={range.to} />
          </label>
          <button type="submit" className="button button-primary">
            Apply Period
          </button>
          <Link href="/admin/reports" className="button button-secondary">
            This Month
          </Link>
        </form>
        <p>
          Selected period: <strong>{date(range.from)}</strong> to{" "}
          <strong>{date(range.to)}</strong>
        </p>
      </section>

      <div className="report-kpi-grid">
        <StatCard label="Leads Created" value={leadsCreated} />
        <StatCard label="Leads Won" value={leadsWon} note={`${conversion.toFixed(1)}% conversion`} />
        <StatCard label="Quotation Value" value={currency(e.quotation_value)} />
        <StatCard label="Order Value" value={currency(orderValue)} />
        <StatCard label="Invoiced" value={currency(e.invoiced_value)} />
        <StatCard label="Collected" value={currency(e.collected_value)} />
        <StatCard label="Recorded Costs" value={currency(expensesValue + workerValue)} />
        <StatCard
          label="Estimated Profit"
          value={currency(profit)}
          note={`${margin.toFixed(1)}% estimated margin`}
        />
      </div>

      <div className="report-insight-grid">
        <section className="panel report-chart-card">
          <div className="panel-head">
            <div>
              <h2>Sales Funnel</h2>
              <p>Lead movement during the selected period.</p>
            </div>
          </div>
          <div className="report-bar-list">
            {funnel.length === 0 ? (
              <div className="empty-state">No lead activity in this period.</div>
            ) : (
              funnel.map((row: any) => {
                const count = Number(row.count || 0);
                return (
                  <div className="report-bar-row" key={row.status}>
                    <div className="report-bar-label">
                      <span>{label(row.status)}</span>
                      <strong>{count}</strong>
                    </div>
                    <div className="report-bar-track">
                      <span style={{ width: `${(count / funnelMax) * 100}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section className="panel report-chart-card">
          <div className="panel-head">
            <div>
              <h2>Last 6 Months</h2>
              <p>Order value, collections and recorded costs.</p>
            </div>
          </div>
          <div className="report-monthly-chart">
            {monthly.map((row: any) => {
              const order = Number(row.order_value || 0);
              const collections = Number(row.collections || 0);
              const costs =
                Number(row.expenses || 0) + Number(row.worker_payments || 0);

              return (
                <div className="report-month-group" key={String(row.month_start)}>
                  <div className="report-month-bars">
                    <span
                      className="report-month-order"
                      style={{ height: `${Math.max(3, (order / monthlyMax) * 100)}%` }}
                      title={`Order value ${currency(order)}`}
                    />
                    <span
                      className="report-month-collection"
                      style={{ height: `${Math.max(3, (collections / monthlyMax) * 100)}%` }}
                      title={`Collections ${currency(collections)}`}
                    />
                    <span
                      className="report-month-cost"
                      style={{ height: `${Math.max(3, (costs / monthlyMax) * 100)}%` }}
                      title={`Costs ${currency(costs)}`}
                    />
                  </div>
                  <strong>{row.month_label}</strong>
                </div>
              );
            })}
          </div>
          <div className="report-chart-legend">
            <span><i className="legend-order" /> Order Value</span>
            <span><i className="legend-collection" /> Collections</span>
            <span><i className="legend-cost" /> Costs</span>
          </div>
        </section>
      </div>

      <div className="report-status-strip">
        <div>
          <span>Active Orders</span>
          <strong>{Number(e.active_orders || 0)}</strong>
        </div>
        <div>
          <span>Location Completion</span>
          <strong>{Number(e.location_completion || 0)}%</strong>
        </div>
        <div>
          <span>Overdue Invoices</span>
          <strong>{Number(e.overdue_invoices || 0)}</strong>
        </div>
        <div>
          <span>Worker Payments</span>
          <strong>{currency(workerValue)}</strong>
        </div>
      </div>

      <div className="report-two-column">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Expense Breakdown</h2>
              <p>Recorded expenses in the selected period.</p>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Entries</th>
                  <th className="align-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {expenses.length === 0 ? (
                  <tr><td colSpan={3} className="empty-cell">No expenses in this period.</td></tr>
                ) : (
                  expenses.map((row: any) => (
                    <tr key={row.category}>
                      <td><strong>{label(row.category)}</strong></td>
                      <td>{row.entries}</td>
                      <td className="align-right"><strong>{currency(row.total)}</strong></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>State Performance</h2>
              <p>Order value by customer state for the selected period.</p>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>State</th>
                  <th>Orders</th>
                  <th className="align-right">Order Value</th>
                </tr>
              </thead>
              <tbody>
                {states.length === 0 ? (
                  <tr><td colSpan={3} className="empty-cell">No state data in this period.</td></tr>
                ) : (
                  states.map((row: any) => (
                    <tr key={row.state}>
                      <td><strong>{row.state}</strong></td>
                      <td>{row.order_count}</td>
                      <td className="align-right"><strong>{currency(row.order_value)}</strong></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="panel report-section">
        <div className="panel-head">
          <div>
            <h2>Order Profitability</h2>
            <p>Estimated gross profitability using recorded expenses and worker payments.</p>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer / Campaign</th>
                <th className="align-right">Order Value</th>
                <th className="align-right">Expenses</th>
                <th className="align-right">Worker Cost</th>
                <th className="align-right">Est. Profit</th>
                <th className="align-right">Margin</th>
              </tr>
            </thead>
            <tbody>
              {profitability.length === 0 ? (
                <tr><td colSpan={7} className="empty-cell">No orders in this period.</td></tr>
              ) : (
                profitability.map((row: any) => {
                  const value = Number(row.total_order_amount || 0);
                  const rowProfit = Number(row.estimated_profit || 0);
                  const rowMargin = value > 0 ? (rowProfit / value) * 100 : 0;
                  return (
                    <tr key={row.id}>
                      <td>
                        <Link href={`/admin/orders/${row.id}`} className="mono">
                          {row.order_no}
                        </Link>
                      </td>
                      <td>
                        <strong>{row.company_name}</strong>
                        <div className="table-subtext">{row.campaign_name}</div>
                      </td>
                      <td className="align-right">{currency(value)}</td>
                      <td className="align-right">{currency(row.expenses)}</td>
                      <td className="align-right">{currency(row.worker_cost)}</td>
                      <td className="align-right">
                        <strong className={rowProfit < 0 ? "finance-negative" : "finance-positive"}>
                          {currency(rowProfit)}
                        </strong>
                      </td>
                      <td className="align-right">{rowMargin.toFixed(1)}%</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="report-two-column">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Customer Outstanding</h2>
              <p>Current receivables irrespective of the selected period.</p>
            </div>
          </div>
          <div className="finance-scroll-list">
            {outstanding.length === 0 ? (
              <div className="empty-state">No customer outstanding.</div>
            ) : (
              outstanding.map((row: any) => (
                <Link
                  href={`/admin/customers/${row.id}`}
                  className="finance-expense-row report-link-row"
                  key={row.id}
                >
                  <div>
                    <strong>{row.company_name}</strong>
                    <span>{row.customer_code || "Customer"} · {row.phone || "No phone"}</span>
                  </div>
                  <strong>{currency(row.outstanding)}</strong>
                </Link>
              ))
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Overdue Invoices</h2>
              <p>Invoices currently beyond their due dates.</p>
            </div>
          </div>
          <div className="finance-scroll-list">
            {overdueInvoices.length === 0 ? (
              <div className="empty-state">No overdue invoices.</div>
            ) : (
              overdueInvoices.map((row: any) => {
                const balance = Math.max(
                  0,
                  Number(row.total_amount) - Number(row.amount_paid)
                );
                return (
                  <Link
                    href={`/admin/finance/invoices/${row.id}`}
                    className="finance-expense-row report-link-row"
                    key={row.id}
                  >
                    <div>
                      <strong>{row.invoice_no} · {row.company_name}</strong>
                      <span>Due {date(row.due_date)} · {row.order_no}</span>
                    </div>
                    <strong className="finance-negative">{currency(balance)}</strong>
                  </Link>
                );
              })
            )}
          </div>
        </section>
      </div>

      <section className="panel report-section">
        <div className="panel-head">
          <div>
            <h2>Worker Payments</h2>
            <p>Payments made to active field workers in the selected period.</p>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Worker</th>
                <th>Skill</th>
                <th>Payment Entries</th>
                <th className="align-right">Paid</th>
              </tr>
            </thead>
            <tbody>
              {workerPayments.length === 0 ? (
                <tr><td colSpan={4} className="empty-cell">No worker payments in this period.</td></tr>
              ) : (
                workerPayments.map((row: any) => (
                  <tr key={row.id}>
                    <td>
                      <Link href={`/admin/workers/${row.id}`} className="text-link">
                        {row.name}
                      </Link>
                      <div className="table-subtext">{row.worker_code}</div>
                    </td>
                    <td>{label(row.skill)}</td>
                    <td>{row.payment_entries}</td>
                    <td className="align-right"><strong>{currency(row.paid_total)}</strong></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
