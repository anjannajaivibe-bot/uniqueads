import Link from "next/link";
import { requireRoles, ACCESS } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/ui";
import { createLead } from "../../actions";
import { getAssignableUsers } from "@/lib/lead-queries";

export const dynamic = "force-dynamic";

export default async function NewLeadPage() {
  await requireRoles(ACCESS.operations);
  const users = await getAssignableUsers();

  return (
    <>
      <PageHeader
        title="New Lead"
        description="Capture the requirement, ownership and next action at the time the enquiry enters the system."
        action={
          <Link href="/admin/leads" className="button button-secondary">
            Back to Leads
          </Link>
        }
      />

      <form action={createLead} className="form-card">
        <div className="form-section-title">
          <div>
            <h2>Customer & Contact</h2>
            <p>Basic details required for follow-up and quotation preparation.</p>
          </div>
        </div>

        <div className="form-grid">
          <label>
            <span>Company Name</span>
            <input name="company_name" placeholder="Client company" />
          </label>
          <label>
            <span>Contact Person *</span>
            <input name="contact_person" required placeholder="Full name" />
          </label>
          <label>
            <span>Phone *</span>
            <input name="phone" required inputMode="tel" placeholder="Mobile number" />
          </label>
          <label>
            <span>WhatsApp</span>
            <input name="whatsapp" inputMode="tel" placeholder="WhatsApp number" />
          </label>
          <label>
            <span>Email</span>
            <input name="email" type="email" placeholder="name@company.com" />
          </label>
          <label>
            <span>Location</span>
            <input name="location" placeholder="City / district / corridor" />
          </label>
        </div>

        <div className="form-section-title form-section-divider">
          <div>
            <h2>Campaign Requirement</h2>
            <p>Record the initial scope even when quantities are only estimates.</p>
          </div>
        </div>

        <div className="form-grid">
          <label>
            <span>Advertising Type</span>
            <select name="advertising_type">
              <option value="">Select</option>
              <option>Wall Painting</option>
              <option>Hoardings</option>
              <option>Outdoor Advertising</option>
              <option>Rural Advertising</option>
              <option>Highway Advertising</option>
              <option>Other</option>
            </select>
          </label>
          <label>
            <span>Number of Locations</span>
            <input
              name="number_of_locations"
              type="number"
              min="0"
              step="1"
              placeholder="Example: 25"
            />
          </label>
          <label>
            <span>Estimated Wall Area (sq.ft)</span>
            <input
              name="estimated_wall_area_sqft"
              type="number"
              min="0"
              step="0.01"
              placeholder="Example: 12000"
            />
          </label>
          <label>
            <span>Campaign Duration (days)</span>
            <input
              name="campaign_duration_days"
              type="number"
              min="0"
              step="1"
              placeholder="Example: 30"
            />
          </label>
          <label className="full">
            <span>Requirement</span>
            <textarea
              name="requirement"
              rows={4}
              placeholder="Campaign requirement, routes, districts, wall quantity, hoarding requirement, timelines..."
            />
          </label>
        </div>

        <div className="form-section-title form-section-divider">
          <div>
            <h2>Lead Control</h2>
            <p>Assign responsibility and define the next follow-up before saving.</p>
          </div>
        </div>

        <div className="form-grid">
          <label>
            <span>Lead Source</span>
            <select name="source" defaultValue="direct">
              <option value="direct">Direct</option>
              <option value="google">Google</option>
              <option value="website">Website</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="referral">Referral</option>
              <option value="existing_customer">Existing Customer</option>
              <option value="meta">Meta</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label>
            <span>Assign To</span>
            <select name="assigned_to" defaultValue="">
              <option value="">Unassigned</option>
              {users.map((user: any) => (
                <option key={user.id} value={user.id}>
                  {user.full_name} · {String(user.role).replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Next Follow-up</span>
            <input name="next_follow_up_at" type="datetime-local" />
          </label>
          <label className="full">
            <span>Remarks</span>
            <textarea name="remarks" rows={3} placeholder="Internal notes" />
          </label>
        </div>

        <div className="form-actions">
          <Link href="/admin/leads" className="button button-secondary">
            Cancel
          </Link>
          <button type="submit" className="button button-primary">
            Save Lead
          </button>
        </div>
      </form>
    </>
  );
}
