import Link from "next/link";
import type { CurrentAppUser } from "@/lib/auth/authorization";

const navigation = [
  ["Dashboard", "/admin", "▦"],
  ["Leads", "/admin/leads", "◎"],
  ["Customers", "/admin/customers", "◉"],
  ["Quotations", "/admin/quotations", "▤"],
  ["Orders", "/admin/orders", "▣"],
  ["Work Progress", "/admin/work-progress", "◫"],
  ["Workers", "/admin/workers", "◌"],
  ["Finance", "/admin/finance", "₹"],
  ["Reports", "/admin/reports", "↗"],
  ["Settings", "/admin/settings", "⚙"],
] as const;

function roleLabel(role: string) {
  return role
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function AdminSidebar() {
  return (
    <aside className="sidebar">
      <div className="brand-block">
        <img src="/unique-ads-logo.png" alt="Unique Ads" className="brand-logo" />
        <div>
          <strong>Unique Ads</strong>
          <span>Operations</span>
        </div>
      </div>

      <nav className="side-nav" aria-label="Admin navigation">
        {navigation.map(([label, href, icon]) => (
          <Link href={href} key={href} className="nav-link">
            <span className="nav-icon" aria-hidden="true">
              {icon}
            </span>
            <span>{label}</span>
          </Link>
        ))}
      </nav>

      <div className="sidebar-foot">
        <div className="scope-pill">Telangana · AP · Karnataka</div>
      </div>
    </aside>
  );
}

export function AdminTopbar({
  currentUser,
}: {
  currentUser: CurrentAppUser;
}) {
  return (
    <header className="topbar">
      <div>
        <p className="topbar-kicker">Unique Ads</p>
        <strong>Operational Control Center</strong>
      </div>

      <div className="topbar-actions">
        <Link href="/admin/leads/new" className="button button-primary">
          + New Lead
        </Link>

        <div className="current-user">
          <div className="current-user-copy">
            <strong>{currentUser.full_name}</strong>
            <span>{roleLabel(currentUser.role)}</span>
          </div>
          <a
            href="/api/app-auth/logout"
            title="Sign out"
            aria-label="Sign out"
            style={{
              display: "grid",
              placeItems: "center",
              width: 34,
              height: 34,
              borderRadius: "999px",
              background: "#071c3b",
              color: "white",
              textDecoration: "none",
              fontSize: 12,
              fontWeight: 850,
              flexShrink: 0,
            }}
          >
            OUT
          </a>
        </div>
      </div>
    </header>
  );
}

