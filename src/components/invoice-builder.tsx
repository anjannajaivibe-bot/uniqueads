"use client";

import { useMemo, useState } from "react";
import { createInvoice } from "@/app/admin/finance/actions";

type Item = {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  rate: number;
};

function currency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

export function InvoiceBuilder({
  orderId,
  orderNo,
  customerName,
  campaignName,
  sourceItems,
  sourceDiscount,
  sourceCgst,
  sourceSgst,
  sourceIgst,
  sourcePaymentTerms,
  orderAmount,
  invoiceDate,
  defaultDueDate,
}: {
  orderId: string;
  orderNo: string;
  customerName: string;
  campaignName: string;
  sourceItems: Array<{
    description: string;
    quantity: string | number;
    unit: string | null;
    rate: string | number;
  }>;
  sourceDiscount: number;
  sourceCgst: number;
  sourceSgst: number;
  sourceIgst: number;
  sourcePaymentTerms: string;
  orderAmount: number;
  invoiceDate: string;
  defaultDueDate: string;
}) {
  const seeded =
    sourceItems.length > 0
      ? sourceItems.map((item) => ({
          id: crypto.randomUUID(),
          description: item.description,
          quantity: Number(item.quantity || 0),
          unit: item.unit || "job",
          rate: Number(item.rate || 0),
        }))
      : [
          {
            id: crypto.randomUUID(),
            description: campaignName,
            quantity: 1,
            unit: "job",
            rate: orderAmount,
          },
        ];

  const [items, setItems] = useState<Item[]>(seeded);
  const [discount, setDiscount] = useState(sourceDiscount || 0);
  const initialTaxMode =
    sourceIgst > 0
      ? "inter_18"
      : sourceCgst > 0 || sourceSgst > 0
        ? "intra_18"
        : "none";
  const [taxMode, setTaxMode] = useState(initialTaxMode);

  const totals = useMemo(() => {
    const subtotal = items.reduce(
      (sum, item) =>
        sum +
        Math.max(0, Number(item.quantity) || 0) *
          Math.max(0, Number(item.rate) || 0),
      0
    );

    const safeDiscount = Math.min(Math.max(0, Number(discount) || 0), subtotal);
    const taxable = subtotal - safeDiscount;
    const cgst = taxMode === "intra_18" ? taxable * 0.09 : 0;
    const sgst = taxMode === "intra_18" ? taxable * 0.09 : 0;
    const igst = taxMode === "inter_18" ? taxable * 0.18 : 0;

    return {
      subtotal,
      safeDiscount,
      taxable,
      cgst,
      sgst,
      igst,
      total: taxable + cgst + sgst + igst,
    };
  }, [items, discount, taxMode]);

  function updateItem(id: string, patch: Partial<Item>) {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  }

  function addItem() {
    setItems((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        description: "",
        quantity: 1,
        unit: "job",
        rate: 0,
      },
    ]);
  }

  function removeItem(id: string) {
    setItems((current) =>
      current.length === 1 ? current : current.filter((item) => item.id !== id)
    );
  }

  return (
    <form action={createInvoice} className="quotation-builder">
      <input type="hidden" name="order_id" value={orderId} />
      <input type="hidden" name="items_json" value={JSON.stringify(items)} />

      <section className="panel invoice-source-card">
        <div>
          <span>Order</span>
          <strong>{orderNo}</strong>
        </div>
        <div>
          <span>Customer</span>
          <strong>{customerName}</strong>
        </div>
        <div>
          <span>Campaign</span>
          <strong>{campaignName}</strong>
        </div>
      </section>

      <section className="form-card">
        <div className="form-section-title">
          <div>
            <h2>Invoice Details</h2>
            <p>Verify date, due date and GST before issuing the invoice.</p>
          </div>
        </div>

        <div className="form-grid">
          <label>
            <span>Invoice Date *</span>
            <input name="invoice_date" type="date" required defaultValue={invoiceDate} />
          </label>
          <label>
            <span>Due Date</span>
            <input name="due_date" type="date" defaultValue={defaultDueDate} />
          </label>
          <label>
            <span>GST</span>
            <select
              name="tax_mode"
              value={taxMode}
              onChange={(e) => setTaxMode(e.target.value)}
            >
              <option value="none">No GST</option>
              <option value="intra_18">18% GST · CGST 9% + SGST 9%</option>
              <option value="inter_18">18% GST · IGST 18%</option>
            </select>
          </label>
          <label>
            <span>Discount</span>
            <input
              name="discount_amount"
              type="number"
              min="0"
              step="0.01"
              value={discount}
              onChange={(e) => setDiscount(Number(e.target.value))}
            />
          </label>
          <label className="full">
            <span>Payment Terms</span>
            <textarea
              name="payment_terms"
              rows={3}
              defaultValue={sourcePaymentTerms}
              placeholder="Payment due terms and bank/payment instructions."
            />
          </label>
          <label className="full">
            <span>Invoice Notes</span>
            <textarea name="notes" rows={2} />
          </label>
        </div>
      </section>

      <section className="form-card">
        <div className="form-section-title quote-items-title">
          <div>
            <h2>Invoice Items</h2>
            <p>Items are copied from the accepted quotation when available.</p>
          </div>
          <button type="button" className="button button-secondary" onClick={addItem}>
            + Add Item
          </button>
        </div>

        <div className="quote-items">
          <div className="quote-item-head">
            <span>Description</span>
            <span>Qty</span>
            <span>Unit</span>
            <span>Rate</span>
            <span>Amount</span>
            <span />
          </div>

          {items.map((item, index) => {
            const amount =
              Math.max(0, Number(item.quantity) || 0) *
              Math.max(0, Number(item.rate) || 0);

            return (
              <div className="quote-item-row" key={item.id}>
                <input
                  aria-label={`Item ${index + 1} description`}
                  required
                  value={item.description}
                  onChange={(e) => updateItem(item.id, { description: e.target.value })}
                />
                <input
                  aria-label={`Item ${index + 1} quantity`}
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={item.quantity}
                  onChange={(e) =>
                    updateItem(item.id, { quantity: Number(e.target.value) })
                  }
                />
                <select
                  aria-label={`Item ${index + 1} unit`}
                  value={item.unit}
                  onChange={(e) => updateItem(item.id, { unit: e.target.value })}
                >
                  <option value="sq.ft">sq.ft</option>
                  <option value="wall">wall</option>
                  <option value="unit">unit</option>
                  <option value="location">location</option>
                  <option value="day">day</option>
                  <option value="job">job</option>
                  <option value="nos">nos</option>
                </select>
                <input
                  aria-label={`Item ${index + 1} rate`}
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.rate}
                  onChange={(e) => updateItem(item.id, { rate: Number(e.target.value) })}
                />
                <strong>{currency(amount)}</strong>
                <button
                  type="button"
                  className="quote-remove"
                  onClick={() => removeItem(item.id)}
                  disabled={items.length === 1}
                  aria-label={`Remove item ${index + 1}`}
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>

        <div className="invoice-total-wrap">
          <div className="quote-totals">
            <div><span>Subtotal</span><strong>{currency(totals.subtotal)}</strong></div>
            {totals.safeDiscount > 0 ? (
              <div><span>Discount</span><strong>- {currency(totals.safeDiscount)}</strong></div>
            ) : null}
            <div><span>Taxable</span><strong>{currency(totals.taxable)}</strong></div>
            {totals.cgst > 0 ? <div><span>CGST 9%</span><strong>{currency(totals.cgst)}</strong></div> : null}
            {totals.sgst > 0 ? <div><span>SGST 9%</span><strong>{currency(totals.sgst)}</strong></div> : null}
            {totals.igst > 0 ? <div><span>IGST 18%</span><strong>{currency(totals.igst)}</strong></div> : null}
            <div className="quote-grand-total">
              <span>Invoice Total</span>
              <strong>{currency(totals.total)}</strong>
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="button button-primary">
            Create Invoice
          </button>
        </div>
      </section>
    </form>
  );
}
