"use client";

import { useMemo, useState } from "react";
import { createQuotation } from "@/app/admin/quotations/actions";

type Customer = {
  id: string;
  customer_code: string | null;
  company_name: string;
  contact_person: string | null;
  phone: string | null;
  state: string | null;
};

type Lead = {
  id: string;
  lead_no: string;
  customer_id: string | null;
  company_name: string | null;
  contact_person: string;
  phone: string;
  location: string | null;
  advertising_type: string | null;
  status: string;
};

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

export function QuotationBuilder({
  customers,
  leads,
  initialLeadId = "",
  initialCustomerId = "",
  defaultValidUntil,
  defaultTermsAndConditions = "",
}: {
  customers: Customer[];
  leads: Lead[];
  initialLeadId?: string;
  initialCustomerId?: string;
  defaultValidUntil: string;
  defaultTermsAndConditions?: string;
}) {
  const initialLead = leads.find((lead) => lead.id === initialLeadId);
  const [customerId, setCustomerId] = useState(
    initialCustomerId || initialLead?.customer_id || ""
  );
  const [leadId, setLeadId] = useState(initialLeadId);
  const [items, setItems] = useState<Item[]>([
    {
      id: crypto.randomUUID(),
      description: "",
      quantity: 1,
      unit: "sq.ft",
      rate: 0,
    },
  ]);
  const [discount, setDiscount] = useState(0);
  const [taxMode, setTaxMode] = useState("none");

  const selectedLead = leads.find((lead) => lead.id === leadId);

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
    const total = taxable + cgst + sgst + igst;

    return { subtotal, safeDiscount, taxable, cgst, sgst, igst, total };
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
        unit: "sq.ft",
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
    <form action={createQuotation} className="quotation-builder">
      <input type="hidden" name="items_json" value={JSON.stringify(items)} />

      <section className="form-card">
        <div className="form-section-title">
          <div>
            <h2>Client & Reference</h2>
            <p>Select an existing customer or link the quotation to a lead.</p>
          </div>
        </div>

        <div className="form-grid">
          <label>
            <span>Customer</span>
            <select
              name="customer_id"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
            >
              <option value="">No customer selected</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.company_name}
                  {customer.customer_code ? ` · ${customer.customer_code}` : ""}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Lead</span>
            <select
              name="lead_id"
              value={leadId}
              onChange={(e) => {
                const value = e.target.value;
                setLeadId(value);
                const lead = leads.find((item) => item.id === value);
                if (lead?.customer_id) setCustomerId(lead.customer_id);
              }}
            >
              <option value="">No lead selected</option>
              {leads.map((lead) => (
                <option key={lead.id} value={lead.id}>
                  {lead.lead_no} · {lead.company_name || lead.contact_person}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Valid Until</span>
            <input name="valid_until" type="date" defaultValue={defaultValidUntil} />
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

          {selectedLead ? (
            <div className="quote-lead-preview full">
              <strong>{selectedLead.company_name || selectedLead.contact_person}</strong>
              <span>
                {selectedLead.contact_person} · {selectedLead.phone}
                {selectedLead.location ? ` · ${selectedLead.location}` : ""}
              </span>
            </div>
          ) : null}

          <label className="full">
            <span>Scope of Work</span>
            <textarea
              name="scope_of_work"
              rows={4}
              defaultValue={
                selectedLead?.advertising_type
                  ? `${selectedLead.advertising_type}${selectedLead.location ? ` - ${selectedLead.location}` : ""}`
                  : ""
              }
              placeholder="Describe campaign scope, locations, specifications and deliverables."
            />
          </label>
        </div>
      </section>

      <section className="form-card quote-items-card">
        <div className="form-section-title quote-items-title">
          <div>
            <h2>Quotation Items</h2>
            <p>Add each billable component separately for clear customer approval.</p>
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
                  value={item.description}
                  onChange={(e) =>
                    updateItem(item.id, { description: e.target.value })
                  }
                  placeholder="Wall painting / hoarding / artwork / transport..."
                  required
                />
                <input
                  aria-label={`Item ${index + 1} quantity`}
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={item.quantity}
                  onChange={(e) =>
                    updateItem(item.id, { quantity: Number(e.target.value) })
                  }
                  required
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
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.rate}
                  onChange={(e) =>
                    updateItem(item.id, { rate: Number(e.target.value) })
                  }
                  required
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

        <div className="quote-calculation-layout">
          <div className="quote-terms">
            <label>
              <span>Payment Terms</span>
              <textarea
                name="payment_terms"
                rows={3}
                placeholder="Enter the agreed payment terms."
              />
            </label>
            <label>
              <span>Terms & Conditions</span>
              <textarea
                name="terms_and_conditions"
                rows={4}
                defaultValue={defaultTermsAndConditions}
                placeholder="Validity, execution conditions, exclusions or other agreed terms."
              />
            </label>
            <label>
              <span>Internal Notes</span>
              <textarea
                name="notes"
                rows={2}
                placeholder="Internal note, not part of the commercial total."
              />
            </label>
          </div>

          <div className="quote-totals">
            <label className="quote-discount">
              <span>Discount</span>
              <input
                name="discount_amount"
                type="number"
                min="0"
                max={totals.subtotal}
                step="0.01"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
              />
            </label>

            <div><span>Subtotal</span><strong>{currency(totals.subtotal)}</strong></div>
            {totals.safeDiscount > 0 ? (
              <div><span>Discount</span><strong>- {currency(totals.safeDiscount)}</strong></div>
            ) : null}
            <div><span>Taxable</span><strong>{currency(totals.taxable)}</strong></div>
            {totals.cgst > 0 ? (
              <div><span>CGST 9%</span><strong>{currency(totals.cgst)}</strong></div>
            ) : null}
            {totals.sgst > 0 ? (
              <div><span>SGST 9%</span><strong>{currency(totals.sgst)}</strong></div>
            ) : null}
            {totals.igst > 0 ? (
              <div><span>IGST 18%</span><strong>{currency(totals.igst)}</strong></div>
            ) : null}
            <div className="quote-grand-total">
              <span>Grand Total</span>
              <strong>{currency(totals.total)}</strong>
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="button button-primary">
            Create Quotation
          </button>
        </div>
      </section>
    </form>
  );
}

