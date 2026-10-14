import Image from "next/image";
import Link from "next/link";
import type { CurrentAppUser } from "@/lib/auth/authorization";
import { ACCESS, roleAllowed } from "@/lib/auth/permissions";

const navigation = [
  { label: "Dashboard", href: "/admin", icon: "▦", roles: null },
  { label: "Leads", href: "/admin/leads", icon: "◎", roles: ACCESS.sales },
  { label: "Customers", href: "/admin/customers", icon: "◉", roles: ACCESS.sales },
  { label: "Quotations", href: "/admin/quotations", icon: "▤", roles: ACCESS.sales },
  { label: "Orders", href: "/admin/orders", icon: "▣", roles: ACCESS.field },
  { label: "Work Progress", href: "/admin/work-progress", icon: "◫", roles: ACCESS.field },
  { label: "Workers", href: "/admin/workers", icon: "◌", roles: ACCESS.field },
  { label: "Finance", href: "/admin/finance", icon: "₹", roles: ACCESS.finance },
  { label: "Reports", href: "/admin/reports", icon: "↗", roles: ACCESS.reports },
  { label: "Settings", href: "/admin/settings", icon: "⚙", roles: ACCESS.settings },
] as const;

function roleLabel(role: string) {
  return role
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function AdminSidebar({
  currentUser,
}: {
  currentUser: CurrentAppUser;
}) {
  const visibleNavigation = navigation.filter(
    (item) => !item.roles || roleAllowed(currentUser.role, item.roles)
  );

  return (
    <aside className="sidebar">
      <div className="brand-block">
        <Image
          src="/unique-ads-logo.png"
          alt="Unique Ads"
          className="brand-logo"
          width={96}
          height={96}
          sizes="96px"
          priority
        />
        <div>
          <strong>Unique Ads</strong>
          <span>Operations</span>
        </div>
      </div>

      <nav className="side-nav" aria-label="Admin navigation">
        {visibleNavigation.map(({ label, href, icon }) => (
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
        {roleAllowed(currentUser.role, ACCESS.sales) ? (
          <Link href="/admin/leads/new" className="button button-primary">
            + New Lead
          </Link>
        ) : null}

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

