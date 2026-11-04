import type { Metadata } from "next";
import { AdminSidebar, AdminTopbar } from "@/components/admin-shell";
import { requireAppUser } from "@/lib/auth/authorization";

export const dynamic = "force-dynamic";

// Keep private staff pages out of search results.
export const metadata: Metadata = {
  robots: { index: false, follow: false, noarchive: true },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = await requireAppUser();

  return (
    <div className="admin-shell">
      <AdminSidebar currentUser={currentUser} />
      <div className="admin-main">
        <AdminTopbar currentUser={currentUser} />
        <main className="content-area">{children}</main>
      </div>
    </div>
  );
}
