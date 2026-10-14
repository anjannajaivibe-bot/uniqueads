"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AppRole, CurrentAppUser } from "@/lib/auth/authorization";

type NavItem = {
  label: string;
  href: string;
  icon: string;
  roles: AppRole[];
};

const allRoles: AppRole[] = [
  "super_admin",
  "operations_manager",
  "supervisor",
  "sales",
  "accounts",
];

const navigation: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: "▦", roles: allRoles },
  {
    label: "Leads",
    href: "/admin/leads",
    icon: "◎",
    roles: ["super_admin", "operations_manager", "sales"],
  },
  {
    label: "Customers",
    href: "/admin/customers",
    icon: "◉",
    roles: ["super_admin", "operations_manager", "sales"],
  },
  {
    label: "Quotations",
    href: "/admin/quotations",
    icon: "▤",
    roles: ["super_admin", "operations_manager", "sales"],
  },
  {
    label: "Orders",
    href: "/admin/orders",
    icon: "▣",
    roles: ["super_admin", "operations_manager", "supervisor"],
  },
  {
    label: "Work Progress",
    href: "/admin/work-progress",
    icon: "◫",
    roles: ["super_admin", "operations_manager", "supervisor"],
  },
  {
    label: "Workers",
    href: "/admin/workers",
    icon: "◌",
    roles: ["super_admin", "operations_manager"],
  },
  {
    label: "Finance",
    href: "/admin/finance",
    icon: "₹",
    roles: ["super_admin", "accounts"],
  },
  {
    label: "Reports",
    href: "/admin/reports",
    icon: "↗",
    roles: ["super_admin", "accounts", "operations_manager"],
  },
  {
    label: "Settings",
    href: "/admin/settings",
    icon: "⚙",
    roles: ["super_admin"],
  },
];

function roleLabel(role: string) {
  return role
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function isActivePath(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminSidebar({
  currentUser,
}: {
  currentUser: CurrentAppUser;
}) {
  const pathname = usePathname();
  const visibleNavigation = navigation.filter((item) =>
    item.roles.includes(currentUser.role)
  );

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
        {visibleNavigation.map((item) => {
          const active = isActivePath(pathname, item.href);
          return (
            <Link
              href={item.href}
              key={item.href}
              className={`nav-link${active ? " nav-link-active" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              <span className="nav-icon" aria-hidden="true">
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-foot">
        <div className="scope-pill">
          <strong>{roleLabel(currentUser.role)}</strong>
          <span>Telangana · AP · Karnataka</span>
        </div>
      </div>
    </aside>
  );
}

function primaryAction(user: CurrentAppUser) {
  if (
    ["super_admin", "operations_manager", "sales"].includes(user.role)
  ) {
    return { href: "/admin/leads/new", label: "+ New Lead" };
  }

  if (user.role === "supervisor") {
    return {
      href: "/admin/work-progress/live-capture",
      label: "Live Capture",
    };
  }

  if (user.role === "accounts") {
    return { href: "/admin/finance", label: "Open Finance" };
  }

  return null;
}

export function AdminTopbar({
  currentUser,
}: {
  currentUser: CurrentAppUser;
}) {
  const action = primaryAction(currentUser);

  return (
    <header className="topbar">
      <div className="topbar-title">
        <p className="topbar-kicker">Unique Ads</p>
        <strong>Operational Control Center</strong>
      </div>

      <div className="topbar-actions">
        {action ? (
          <Link href={action.href} className="button button-primary topbar-cta">
            {action.label}
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
            className="signout-button"
          >
            OUT
          </a>
        </div>
      </div>
    </header>
  );
}
