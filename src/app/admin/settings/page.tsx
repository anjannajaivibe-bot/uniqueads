import { PageHeader } from "@/components/ui";
import { requireAppUser } from "@/lib/auth/authorization";
import {
  getAppUsers,
  getCompanySettingsRecord,
} from "@/lib/settings-queries";
import Link from "next/link";
import {
  saveCompanySettings,
  updateAppUserAccess,
} from "./actions";

export const dynamic = "force-dynamic";

function dateTime(value: any) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export default async function SettingsPage() {
  const currentUser = await requireAppUser();

  if (currentUser.role !== "super_admin") {
    return (
      <>
        <PageHeader
          title="Settings"
          description="Company configuration and user access."
        />
        <section className="panel settings-access-denied">
          <h2>Super Admin access required</h2>
          <p>
            Company settings, banking information and user roles are restricted
            to Super Admin accounts.
          </p>
        </section>
      </>
    );
  }

  const [settings, users] = await Promise.all([
    getCompanySettingsRecord(),
    getAppUsers(),
  ]);

  const s = (settings || {}) as any;

  return (
    <>
      <PageHeader
        title="Settings"
        description="Company identity, GST, banking, document defaults and controlled staff access."
      />

      <div className="settings-layout">
        <section className="settings-main-column">
          <form action={saveCompanySettings} className="form-card">
            <div className="form-section-title">
              <div>
                <h2>Company Profile</h2>
                <p>
                  These details are used on quotations, invoices and official
                  customer documents.
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
                <input
                  name="email"
                  type="email"
                  defaultValue={s.email || ""}
                />
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
                <textarea
                  name="address"
                  rows={3}
                  defaultValue={s.address || ""}
                />
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
                <p>
                  These details can appear on invoices to help customers pay
                  correctly.
                </p>
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
                <p>
                  Default wording is automatically offered when new quotations
                  and invoices are created.
                </p>
              </div>
            </div>

            <div className="form-grid">
              <label className="full">
                <span>Default Quotation Terms</span>
                <textarea
                  name="quotation_terms"
                  rows={6}
                  defaultValue={s.quotation_terms || ""}
                  placeholder="Quotation validity, material/execution conditions, exclusions, approval terms..."
                />
              </label>
              <label className="full">
                <span>Default Invoice / Payment Terms</span>
                <textarea
                  name="invoice_terms"
                  rows={6}
                  defaultValue={s.invoice_terms || ""}
                  placeholder="Payment due period, payment instructions, late-payment notes..."
                />
              </label>
            </div>

            <div className="form-actions">
              <button type="submit" className="button button-primary">
                Save Company Settings
              </button>
            </div>
          </form>

          <section className="panel settings-users-panel">
            <div className="panel-head">
              <div>
                <h2>Staff Access</h2>
                <p>
                  Review roles and account status. Create logins, reset passwords,
                  assign teams and link supervisors to workers from Users & Access.
                </p>
              </div>
              <Link href="/admin/settings/users" className="button button-primary">
                Users & Access
              </Link>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Login</th>
                    <th>Role / Status / Updated</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {users.map((user: any) => (
                    <tr key={user.id}>
                      <td>
                        <strong>{user.full_name}</strong>
                        <div className="table-subtext">
                          {user.email}
                          {user.phone ? ` · ${user.phone}` : ""}
                        </div>
                      </td>
                      <td>
                        <span
                          className={`status ${
                            user.username
                              ? "status-completed"
                              : "status-draft"
                          }`}
                        >
                          {user.username ? user.username : "No credentials"}
                        </span>
                      </td>
                      <td colSpan={2}>
                        <form
                          action={updateAppUserAccess}
                          className="settings-user-access-form"
                        >
                          <input type="hidden" name="user_id" value={user.id} />
                          <select name="role" defaultValue={user.role}>
                            <option value="super_admin">Super Admin</option>
                            <option value="operations_manager">
                              Operations Manager
                            </option>
                            <option value="accounts">Accounts</option>
                            <option value="supervisor">Supervisor</option>
                            <option value="sales">Sales</option>
                          </select>
                          <select
                            name="is_active"
                            defaultValue={user.is_active ? "true" : "false"}
                          >
                            <option value="true">Active</option>
                            <option value="false">Inactive</option>
                          </select>
                          <span>{dateTime(user.updated_at)}</span>
                          <button
                            type="submit"
                            className="button button-compact button-secondary"
                          >
                            Save
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </section>

        <aside className="settings-side-column">
          <section className="form-card sticky-card">
            <div className="form-section-title">
              <div>
                <h2>Users & Access</h2>
                <p>
                  Create username/password logins, reset passwords, assign teams
                  and link Supervisor accounts to worker records.
                </p>
              </div>
            </div>
            <Link href="/admin/settings/users" className="button button-primary button-full">
              Manage Users & Access
            </Link>
          </section>

          <section className="panel settings-role-guide">
            <div className="panel-head">
              <div>
                <h2>Role Guide</h2>
                <p>Target access model for production.</p>
              </div>
            </div>
            <div className="role-guide-list">
              <div>
                <strong>Super Admin</strong>
                <span>All modules, company settings and user access.</span>
              </div>
              <div>
                <strong>Operations Manager</strong>
                <span>Orders, execution, workers and operational reporting.</span>
              </div>
              <div>
                <strong>Accounts</strong>
                <span>Invoices, collections, expenses and financial reports.</span>
              </div>
              <div>
                <strong>Supervisor</strong>
                <span>Assigned order execution and field progress.</span>
              </div>
              <div>
                <strong>Sales</strong>
                <span>Leads, customers and quotation workflow.</span>
              </div>
            </div>
          </section>

          <section className="panel settings-security-note">
            <strong>Login security active</strong>
            <p>
              Unique Ads uses Admin-managed username/password access, signed
              12-hour sessions, failed-login lockout, login audit records and
              role-based module permissions. Use Users & Access for credential
              creation and password resets.
            </p>
          </section>
        </aside>
      </div>
    </>
  );
}
