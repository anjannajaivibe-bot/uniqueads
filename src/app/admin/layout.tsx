import "./admin-ui.css";
import { AdminSidebar, AdminTopbar } from "@/components/admin-shell";
import { requireAppUser } from "@/lib/auth/authorization";

export const dynamic = "force-dynamic";

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
