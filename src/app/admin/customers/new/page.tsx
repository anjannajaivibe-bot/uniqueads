import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { createCustomer } from "../actions";

export default function NewCustomerPage() {
  return (
    <>
      <PageHeader
        title="Add Customer"
        description="Create a customer account for quotations, orders, invoices and collections."
        action={
          <Link href="/admin/customers" className="button button-secondary">
            Back to Customers
          </Link>
        }
      />

      <form action={createCustomer} className="form-card">
        <div className="form-section-title">
          <div>
            <h2>Customer Profile</h2>
            <p>Company, contact and billing information used across commercial documents.</p>
          </div>
        </div>

        <div className="form-grid">
          <label>
            <span>Company / Customer Name *</span>
            <input name="company_name" required />
          </label>
          <label>
            <span>Contact Person</span>
            <input name="contact_person" />
          </label>
          <label>
            <span>Phone</span>
            <input name="phone" inputMode="tel" />
          </label>
          <label>
            <span>WhatsApp</span>
            <input name="whatsapp" inputMode="tel" />
          </label>
          <label>
            <span>Email</span>
            <input name="email" type="email" />
          </label>
          <label>
            <span>GSTIN</span>
            <input name="gstin" placeholder="GST registration number" />
          </label>
          <label>
            <span>City</span>
            <input name="city" />
          </label>
          <label>
            <span>State</span>
            <select name="state" defaultValue="">
              <option value="">Select</option>
              <option>Telangana</option>
              <option>Andhra Pradesh</option>
              <option>Karnataka</option>
              <option>Other</option>
            </select>
          </label>
          <label>
            <span>Pincode</span>
            <input name="pincode" inputMode="numeric" />
          </label>
          <label className="full">
            <span>Billing Address</span>
            <textarea name="billing_address" rows={3} />
          </label>
          <label className="full">
            <span>Internal Notes</span>
            <textarea name="notes" rows={3} />
          </label>
        </div>

        <div className="form-actions">
          <Link href="/admin/customers" className="button button-secondary">
            Cancel
          </Link>
          <button type="submit" className="button button-primary">
            Save Customer
          </button>
        </div>
      </form>
    </>
  );
}
