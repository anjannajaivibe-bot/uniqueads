import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { InvoiceBuilder } from "@/components/invoice-builder";
import {
  getFinanceCompanySettings,
  getFinanceOrderOptions,
  getInvoiceOrderSource,
  getInvoiceSourceItems,
} from "@/lib/finance-queries";

export const dynamic = "force-dynamic";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const params = await searchParams;
  const orders = await getFinanceOrderOptions();

  const selectedOrderId =
    params.order && orders.some((row: any) => String(row.id) === params.order)
      ? params.order
      : orders.length > 0
        ? String((orders[0] as any).id)
        : "";

  if (!selectedOrderId) {
    return (
      <>
        <PageHeader
          title="Create Invoice"
          description="Invoices are created from confirmed orders."
          action={
            <Link href="/admin/finance" className="button button-secondary">
              Back to Finance
            </Link>
          }
        />
        <section className="panel">
          <div className="empty-state">
            No orders exist yet. Create or convert an order before generating an invoice.
          </div>
        </section>
      </>
    );
  }

  const source = await getInvoiceOrderSource(selectedOrderId);
  if (!source) {
    return (
      <section className="panel">
        <div className="empty-state">Selected order was not found.</div>
      </section>
    );
  }

  const s = source as any;
  const [items, companySettings] = await Promise.all([
    getInvoiceSourceItems(
      s.quotation_id ? String(s.quotation_id) : null
    ),
    getFinanceCompanySettings(),
  ]);

  const today = new Date();
  const due = new Date();
  due.setDate(due.getDate() + 15);

  return (
    <>
      <PageHeader
        title="Create Invoice"
        description="Generate an invoice from an order and carry forward accepted quotation items where available."
        action={
          <Link href="/admin/finance" className="button button-secondary">
            Back to Finance
          </Link>
        }
      />

      <section className="panel invoice-order-selector">
        <form method="get">
          <label>
            <span>Select Order</span>
            <select name="order" defaultValue={selectedOrderId}>
              {orders.map((order: any) => (
                <option key={order.id} value={order.id}>
                  {order.order_no} · {order.company_name} · {order.campaign_name}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="button button-secondary">
            Load Order
          </button>
        </form>
      </section>

      <InvoiceBuilder
        orderId={String(s.id)}
        orderNo={s.order_no}
        customerName={s.company_name}
        campaignName={s.campaign_name}
        sourceItems={items as any}
        sourceDiscount={Number(s.quotation_discount || 0)}
        sourceCgst={Number(s.quotation_cgst || 0)}
        sourceSgst={Number(s.quotation_sgst || 0)}
        sourceIgst={Number(s.quotation_igst || 0)}
        sourcePaymentTerms={
          s.quotation_payment_terms ||
          (companySettings as any)?.invoice_terms ||
          ""
        }
        orderAmount={Number(s.total_order_amount || 0)}
        invoiceDate={today.toISOString().slice(0, 10)}
        defaultDueDate={due.toISOString().slice(0, 10)}
      />
    </>
  );
}

