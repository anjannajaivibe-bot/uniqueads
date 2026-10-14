import Link from "next/link";
import { PageHeader, StatCard } from "@/components/ui";
import {
  getExpenseList,
  getFinanceOrderOptions,
  getFinanceSummary,
  getInvoiceList,
  getOrderProfitability,
} from "@/lib/finance-queries";
import { createExpense } from "./actions";

export const dynamic = "force-dynamic";

function label(value: string | null | undefined) {
  return String(value ?? "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
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

function currency(value: unknown) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export default async function FinancePage() {
  const [summary, invoices, expenses, orders, profitability] =
    await Promise.all([
      getFinanceSummary(),
      getInvoiceList(),
      getExpenseList(),
      getFinanceOrderOptions(),
      getOrderProfitability(),
    ]);

  const s = summary as any;
  const invoiceTotal = Number(s.invoice_total || 0);
  const invoicePaid = Number(s.invoice_paid || 0);
  const outstanding = Math.max(0, invoiceTotal - invoicePaid);

  const estimatedProfit =
    Number(s.total_order_value || 0) -
    Number(s.total_expenses || 0) -
    Number(s.total_worker_payments || 0);

  return (
    <>
      <PageHeader
        title="Finance"
        description="Invoices, collections, operating expenses, worker payouts and order profitability."
        action={
          <div className="header-actions">
            <Link href="/admin/finance/worker-payments" className="button button-secondary">Worker Payments</Link>
            <Link href="/admin/finance/invoices/new" className="button button-primary">+ Create Invoice</Link>
          </div>
        }
      />

      <div className="finance-kpi-grid">
        <StatCard label="Total Invoiced" value={currency(invoiceTotal)} />
        <StatCard label="Collected" value={currency(invoicePaid)} />
        <StatCard label="Outstanding" value={currency(outstanding)} />
        <StatCard
          label="Collections This Month"
          value={currency(s.collections_month)}
        />
        <StatCard label="Expenses This Month" value={currency(s.expenses_month)} />
        <StatCard
          label="Worker Payments This Month"
          value={currency(s.worker_payments_month)}
        />
        <StatCard
          label="Estimated Gross Profit"
          value={currency(estimatedProfit)}
          note="Order value less recorded expenses and worker payments"
        />
      </div>

      <section className="panel finance-section">
        <div className="panel-head">
          <div>
            <h2>Invoices & Collections</h2>
            <p>Open an invoice to issue it, print it or record customer payments.</p>
          </div>
          <Link href="/admin/finance/invoices/new" className="button button-secondary">
            + New Invoice
          </Link>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Customer / Order</th>
                <th>Date</th>
                <th>Due</th>
                <th>Status</th>
                <th className="align-right">Total</th>
                <th className="align-right">Outstanding</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="empty-cell">
                    No invoices yet.
                  </td>
                </tr>
              ) : (
                invoices.map((row: any) => {
                  const balance = Math.max(
                    0,
                    Number(row.total_amount) - Number(row.amount_paid)
                  );
                  const overdue =
                    row.due_date &&
                    !["paid", "cancelled"].includes(row.status) &&
                    new Date(row.due_date).getTime() < Date.now();

                  return (
                    <tr key={row.id}>
                      <td>
                        <Link
                          href={`/admin/finance/invoices/${row.id}`}
                          className="mono"
                        >
                          {row.invoice_no}
                        </Link>
                      </td>
                      <td>
                        <strong>{row.company_name}</strong>
                        <div className="table-subtext">
                          {row.order_no} · {row.campaign_name}
                        </div>
                      </td>
                      <td>{date(row.invoice_date)}</td>
                      <td>
                        <span className={overdue ? "followup-overdue" : ""}>
                          {date(row.due_date)}
                        </span>
                        {overdue ? <div className="overdue-label">Overdue</div> : null}
                      </td>
                      <td>
                        <span className={`status status-${row.status}`}>
                          {label(row.status)}
                        </span>
                      </td>
                      <td className="align-right">
                        <strong>{currency(row.total_amount)}</strong>
                      </td>
                      <td className="align-right">
                        <strong>{currency(balance)}</strong>
                      </td>
                      <td className="align-right">
                        <Link
                          href={`/admin/finance/invoices/${row.id}`}
                          className="button button-compact button-secondary"
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="finance-two-column">
        <section className="form-card">
          <div className="form-section-title">
            <div>
              <h2>Record Expense</h2>
              <p>Link direct campaign costs to an order wherever possible for profitability reporting.</p>
            </div>
          </div>

          <form action={createExpense}>
            <div className="form-grid">
              <label>
                <span>Expense Date *</span>
                <input
                  name="expense_date"
                  type="date"
                  required
                  defaultValue={new Date().toISOString().slice(0, 10)}
                />
              </label>
              <label>
                <span>Category *</span>
                <select name="category" required defaultValue="paint">
                  <option value="paint">Paint</option>
                  <option value="brushes_material">Brushes / Material</option>
                  <option value="printing">Printing</option>
                  <option value="vinyl">Vinyl</option>
                  <option value="transport">Transport</option>
                  <option value="fuel">Fuel</option>
                  <option value="lodging">Lodging</option>
                  <option value="food">Food</option>
                  <option value="wall_owner_payment">Wall Owner Payment</option>
                  <option value="permissions">Permissions</option>
                  <option value="contractor_payment">Contractor Payment</option>
                  <option value="office">Office</option>
                  <option value="salary">Salary</option>
                  <option value="miscellaneous">Miscellaneous</option>
                </select>
              </label>
              <label>
                <span>Order</span>
                <select name="order_id" defaultValue="">
                  <option value="">General / not linked</option>
                  {orders.map((order: any) => (
                    <option key={order.id} value={order.id}>
                      {order.order_no} · {order.company_name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Vendor</span>
                <input name="vendor_name" />
              </label>
              <label>
                <span>Amount *</span>
                <input
                  name="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                />
              </label>
              <label>
                <span>Payment Method</span>
                <select name="payment_method" defaultValue="">
                  <option value="">Select</option>
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="upi">UPI</option>
                  <option value="cheque">Cheque</option>
                  <option value="card">Card</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label className="full">
                <span>Description *</span>
                <textarea name="description" rows={3} required />
              </label>
              <label className="full">
                <span>Bill / Receipt URL</span>
                <input
                  name="bill_url"
                  placeholder="Optional cloud file or bill URL"
                />
              </label>
            </div>
            <div className="form-actions">
              <button type="submit" className="button button-primary">
                Save Expense
              </button>
            </div>
          </form>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Recent Expenses</h2>
              <p>Latest operating and campaign costs.</p>
            </div>
          </div>
          <div className="finance-scroll-list">
            {expenses.length === 0 ? (
              <div className="empty-state">No expenses recorded yet.</div>
            ) : (
              expenses.slice(0, 20).map((row: any) => (
                <div className="finance-expense-row" key={row.id}>
                  <div>
                    <strong>{row.description}</strong>
                    <span>
                      {date(row.expense_date)} · {label(row.category)}
                      {row.order_no ? ` · ${row.order_no}` : ""}
                    </span>
                  </div>
                  <strong>{currency(row.amount)}</strong>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="panel finance-section">
        <div className="panel-head">
          <div>
            <h2>Order Profitability</h2>
            <p>
              Estimated profit = order value - recorded order expenses - recorded worker payments.
            </p>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer / Campaign</th>
                <th className="align-right">Order Value</th>
                <th className="align-right">Collected</th>
                <th className="align-right">Expenses</th>
                <th className="align-right">Worker Cost</th>
                <th className="align-right">Est. Profit</th>
                <th className="align-right">Margin</th>
              </tr>
            </thead>
            <tbody>
              {profitability.length === 0 ? (
                <tr>
                  <td colSpan={8} className="empty-cell">
                    No orders available for profitability reporting.
                  </td>
                </tr>
              ) : (
                profitability.map((row: any) => {
                  const value = Number(row.total_order_amount || 0);
                  const profit = Number(row.estimated_profit || 0);
                  const margin = value > 0 ? (profit / value) * 100 : 0;

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
                      <td className="align-right">{currency(row.collected)}</td>
                      <td className="align-right">{currency(row.expenses)}</td>
                      <td className="align-right">{currency(row.worker_cost)}</td>
                      <td className="align-right">
                        <strong className={profit < 0 ? "finance-negative" : "finance-positive"}>
                          {currency(profit)}
                        </strong>
                      </td>
                      <td className="align-right">
                        <strong className={margin < 0 ? "finance-negative" : ""}>
                          {margin.toFixed(1)}%
                        </strong>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
