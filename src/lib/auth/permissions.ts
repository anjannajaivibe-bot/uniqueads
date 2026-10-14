import { redirect } from "next/navigation";
import { requireAppUser } from "@/lib/auth/authorization";

export type AppRole =
  | "super_admin"
  | "accounts"
  | "operations_manager"
  | "supervisor"
  | "sales";

export const ACCESS = {
  sales: ["super_admin", "operations_manager", "sales"] as AppRole[],
  operations: ["super_admin", "operations_manager"] as AppRole[],
  field: ["super_admin", "operations_manager", "supervisor"] as AppRole[],
  finance: ["super_admin", "accounts"] as AppRole[],
  reports: ["super_admin", "accounts", "operations_manager"] as AppRole[],
  settings: ["super_admin"] as AppRole[],
};

export async function requireRoles(allowed: readonly AppRole[]) {
  const user = await requireAppUser();
  if (!allowed.includes(user.role as AppRole)) {
    redirect("/unauthorized");
  }
  return user;
}

export function roleAllowed(role: string, allowed: readonly AppRole[]) {
  return allowed.includes(role as AppRole);
}
