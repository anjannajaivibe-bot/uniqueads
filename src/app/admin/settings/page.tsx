import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { getCompanySettingsRecord } from "@/lib/settings-queries";
import { saveCompanySettings } from "./actions";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getCompanySettingsRecord();
  const s = (settings || {}) as any;

  return (
    <>
      <PageHeader
        title="Settings"
        description="Company identity, GST, banking and document defaults."
        action={
          <Link href="/admin/settings/users" className="button button-primary">
            Users & Access
          </Link>
        }
      />

      <div className="settings-layout settings-layout-single">
        <section className="settings-main-column">
          <form action={saveCompanySettings} className="form-card">
            <div className="form-section-title">
              <div>
                <h2>Company Profile</h2>
                <p>
                  Used on quotations, invoices and official customer documents.
                </p>
              </div>
            </div>

            <div className="form-grid">
              <label>
                <span>Brand / Company Name *</span>
                <input
                  name="company_name"
                  required
                  defaultValue={s.company_name || "Unique Ads"}
                />
              </label>
              <label>
                <span>Legal Name</span>
                <input name="legal_name" defaultValue={s.legal_name || ""} />
              </label>
              <label>
                <span>Phone</span>
                <input name="phone" defaultValue={s.phone || ""} />
              </label>
              <label>
                <span>WhatsApp</span>
                <input name="whatsapp" defaultValue={s.whatsapp || ""} />
              </label>
              <label>
                <span>Email</span>
                <input name="email" type="email" defaultValue={s.email || ""} />
              </label>
              <label>
                <span>Website</span>
                <input
                  name="website"
                  placeholder="https://..."
                  defaultValue={s.website || ""}
                />
              </label>
              <label>
                <span>GSTIN</span>
                <input name="gstin" defaultValue={s.gstin || ""} />
              </label>
              <label>
                <span>PAN</span>
                <input name="pan" defaultValue={s.pan || ""} />
              </label>
              <label className="full">
                <span>Business Address</span>
                <textarea name="address" rows={3} defaultValue={s.address || ""} />
              </label>
              <label className="full">
                <span>Logo URL</span>
                <input
                  name="logo_url"
                  defaultValue={s.logo_url || "/unique-ads-logo.png"}
                />
              </label>
            </div>

            <div className="form-section-title form-section-divider">
              <div>
                <h2>Bank & Payment Details</h2>
                <p>Shown on invoices when payment details are available.</p>
              </div>
            </div>

            <div className="form-grid">
              <label>
                <span>Bank Name</span>
                <input name="bank_name" defaultValue={s.bank_name || ""} />
              </label>
              <label>
                <span>Account Name</span>
                <input
                  name="bank_account_name"
                  defaultValue={s.bank_account_name || ""}
                />
              </label>
              <label>
                <span>Account Number</span>
                <input
                  name="bank_account_number"
                  defaultValue={s.bank_account_number || ""}
                />
              </label>
              <label>
                <span>IFSC</span>
                <input name="ifsc_code" defaultValue={s.ifsc_code || ""} />
              </label>
              <label>
                <span>UPI ID</span>
                <input name="upi_id" defaultValue={s.upi_id || ""} />
              </label>
            </div>

            <div className="form-section-title form-section-divider">
              <div>
                <h2>Commercial Defaults</h2>
                <p>Automatically offered on new quotations and invoices.</p>
              </div>
            </div>

            <div className="form-grid">
              <label className="full">
                <span>Default Quotation Terms</span>
                <textarea
                  name="quotation_terms"
                  rows={6}
                  defaultValue={s.quotation_terms || ""}
                  placeholder="Quotation validity, execution conditions, exclusions and approval terms..."
                />
              </label>
              <label className="full">
                <span>Default Invoice / Payment Terms</span>
                <textarea
                  name="invoice_terms"
                  rows={6}
                  defaultValue={s.invoice_terms || ""}
                  placeholder="Payment due period, payment instructions and collection terms..."
                />
              </label>
            </div>

            <div className="form-actions">
              <button type="submit" className="button button-primary">
                Save Company Settings
              </button>
            </div>
          </form>
        </section>

        <aside className="settings-side-column">
          <section className="panel settings-role-guide">
            <div className="panel-head">
              <div>
                <h2>Access Control</h2>
                <p>Team credentials are managed separately from company settings.</p>
              </div>
            </div>
            <div className="role-guide-list">
              <div>
                <strong>Super Admin</strong>
                <span>All modules, settings and user access.</span>
              </div>
              <div>
                <strong>Operations Manager</strong>
                <span>Sales pipeline, orders, execution, workers and reports.</span>
              </div>
              <div>
                <strong>Accounts</strong>
                <span>Finance, collections, expenses and reports.</span>
              </div>
              <div>
                <strong>Supervisor</strong>
                <span>Assigned orders, work progress and live photo proof.</span>
              </div>
              <div>
                <strong>Sales</strong>
                <span>Leads, customers and quotation workflow.</span>
              </div>
            </div>
            <div className="settings-link-stack">
              <Link href="/admin/settings/users" className="button button-secondary button-full">
                Manage Users & Access
              </Link>
              <Link href="/admin/settings/activity" className="button button-secondary button-full">
                Activity & Login Audit
              </Link>
            </div>
          </section>

          <section className="panel settings-security-note">
            <strong>Production security</strong>
            <p>
              Unique Ads now uses admin-managed usernames and passwords, signed
              server sessions, role-based module access and login auditing.
            </p>
          </section>
        </aside>
      </div>
    </>
  );
}
