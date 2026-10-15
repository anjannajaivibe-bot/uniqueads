import Link from "next/link";
import { requireAppUser } from "@/lib/auth/authorization";
import { PageHeader, StatCard } from "@/components/ui";
import { LeadsTable } from "@/components/leads-table";
import { getLeadList, getLeadPipelineCounts } from "@/lib/lead-queries";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const currentUser = await requireAppUser();
  const [rows, counts] = await Promise.all([
    getLeadList(currentUser),
    getLeadPipelineCounts(currentUser),
  ]);

  const leads = rows.map((row: any) => ({
    ...row,
    created_at: row.created_at ? new Date(row.created_at).toISOString() : null,
    updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : null,
    next_follow_up_at: row.next_follow_up_at
      ? new Date(row.next_follow_up_at).toISOString()
      : null,
  }));

  return (
    <>
      <PageHeader
        title="Leads"
        description="Control every enquiry, assignment and follow-up from first contact through conversion."
        action={currentUser.role !== "sales" ?
          <Link href="/admin/leads/new" className="button button-primary">
            + Add Lead
          </Link>
        : null}
      />

      <div className="lead-stats">
        <StatCard label="New" value={Number((counts as any).new_count || 0)} />
        <StatCard
          label="Active Follow-up"
          value={
            Number((counts as any).contacted_count || 0) +
            Number((counts as any).requirement_count || 0) +
            Number((counts as any).quotation_count || 0) +
            Number((counts as any).negotiation_count || 0)
          }
        />
        <StatCard
          label="Overdue Follow-ups"
          value={Number((counts as any).overdue_count || 0)}
          note="Requires attention"
        />
        <StatCard label="Won" value={Number((counts as any).won_count || 0)} />
      </div>

      <LeadsTable leads={leads as any} />
    </>
  );
}
