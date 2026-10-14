import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { createWorker } from "../actions";

export default function NewWorkerPage() {
  return (
    <>
      <PageHeader
        title="Add Worker"
        description="Create a field-worker record for assignment, tracking and payments."
        action={
          <Link href="/admin/workers" className="button button-secondary">
            Back to Workers
          </Link>
        }
      />

      <form action={createWorker} className="form-card">
        <div className="form-section-title">
          <div>
            <h2>Worker Profile</h2>
            <p>Basic worker details and default payment arrangement.</p>
          </div>
        </div>

        <div className="form-grid">
          <label>
            <span>Name *</span>
            <input name="name" required placeholder="Worker full name" />
          </label>
          <label>
            <span>Phone</span>
            <input name="phone" inputMode="tel" placeholder="Mobile number" />
          </label>
          <label>
            <span>Skill *</span>
            <select name="skill" defaultValue="painter">
              <option value="painter">Painter</option>
              <option value="helper">Helper</option>
              <option value="supervisor">Supervisor</option>
              <option value="driver">Driver</option>
              <option value="installer">Installer</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label>
            <span>State</span>
            <select name="state" defaultValue="">
              <option value="">Select</option>
              <option>Telangana</option>
              <option>Andhra Pradesh</option>
              <option>Karnataka</option>
            </select>
          </label>
          <label>
            <span>Payment Mode *</span>
            <select name="payment_mode" defaultValue="daily">
              <option value="daily">Daily</option>
              <option value="per_wall">Per Wall</option>
              <option value="per_sqft">Per sq.ft</option>
              <option value="fixed">Fixed</option>
              <option value="milestone">Milestone</option>
            </select>
          </label>
          <label>
            <span>Default Rate</span>
            <input name="default_rate" type="number" min="0" step="0.01" />
          </label>
          <label>
            <span>Joined On</span>
            <input name="joined_on" type="date" />
          </label>
          <label className="full">
            <span>Address</span>
            <textarea name="address" rows={3} />
          </label>
        </div>

        <div className="form-section-title form-section-divider">
          <div>
            <h2>Payment Details</h2>
            <p>Optional. Use only the details needed for worker payments.</p>
          </div>
        </div>

        <div className="form-grid">
          <label>
            <span>Account Name</span>
            <input name="bank_account_name" />
          </label>
          <label>
            <span>Bank Account Number</span>
            <input name="bank_account_number" inputMode="numeric" />
          </label>
          <label>
            <span>IFSC</span>
            <input name="ifsc_code" />
          </label>
          <label>
            <span>UPI ID</span>
            <input name="upi_id" />
          </label>
        </div>

        <div className="form-actions">
          <Link href="/admin/workers" className="button button-secondary">
            Cancel
          </Link>
          <button type="submit" className="button button-primary">
            Save Worker
          </button>
        </div>
      </form>
    </>
  );
}
