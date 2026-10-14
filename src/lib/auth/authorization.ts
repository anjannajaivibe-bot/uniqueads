import { getPasswordSessionAppUser } from "@/lib/auth/password-session";
import { redirect } from "next/navigation";

export type AppRole =
  | "super_admin"
  | "accounts"
  | "operations_manager"
  | "supervisor"
  | "sales";

export type CurrentAppUser = {
  id: string;
  auth_user_id: string | null;
  full_name: string;
  email: string | null;
  username: string | null;
  worker_id: string | null;
  role: AppRole;
  is_active: boolean;
};

export async function requireAppUser(): Promise<CurrentAppUser> {
  const currentUser = await getPasswordSessionAppUser();

  if (!currentUser) {
    redirect("/login");
  }

  return currentUser as CurrentAppUser;
}

export async function requireRole(allowedRoles: AppRole[]) {
  const currentUser = await requireAppUser();

  if (!allowedRoles.includes(currentUser.role)) {
    redirect("/unauthorized");
  }

  return currentUser;
}
