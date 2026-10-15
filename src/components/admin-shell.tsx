"use client";

import { usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { CurrentAppUser } from "@/lib/auth/authorization";
// Client-safe display permissions. Actual access remains enforced on the server.
const ACCESS = {
 sales: ["super_admin", "operations_manager", "sales"],
 field: ["super_admin", "operations_manager", "supervisor"],
 finance: ["super_admin", "accounts"],
 reports: ["super_admin", "accounts", "operations_manager"],
 settings: ["super_admin"]
};
function roleAllowed(role: string, allowed: readonly string[]) { return allowed.includes(role); }

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
  const pathname = usePathname();
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
          <Link href={href} key={href} className={`nav-link ${pathname === href || (href !== "/admin" && pathname.startsWith(href + "/")) ? "nav-active" : ""}`}>
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
  const pathname = usePathname();
  const visibleNavigation = navigation.filter((item) => !item.roles || roleAllowed(currentUser.role, item.roles));
  const currentPage = [...visibleNavigation].reverse().find((item) => pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href + "/")));
  return (
    <header className="topbar">
      <div>
        <p className="topbar-kicker">Unique Ads</p>
        <strong className="desktop-title">Operational Control Center</strong>
        <strong className="mobile-title">{currentPage?.label ?? "Home"}</strong>
      </div>

      <div className="topbar-actions">
        <details className="mobile-menu">
          <summary aria-label="Open main menu">☰ <span>Menu</span></summary>
          <nav aria-label="Mobile navigation" className="mobile-menu-links">
            {visibleNavigation.map(({label, href, icon}) => <Link key={href} href={href} className="mobile-menu-link"><span aria-hidden="true">{icon}</span>{label}</Link>)}
            <a href="/api/app-auth/logout" className="mobile-menu-link">↪ Sign out</a>
          </nav>
        </details>
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

