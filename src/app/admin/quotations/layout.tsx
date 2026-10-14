import type { ReactNode } from "react";
import { ACCESS, requireRoles } from "@/lib/auth/permissions";

export default async function ModuleLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireRoles(ACCESS.sales);
  return children;
}
