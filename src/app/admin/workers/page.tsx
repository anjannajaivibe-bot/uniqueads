import Link from "next/link";
import { PageHeader, StatCard } from "@/components/ui";
import { WorkersTable } from "@/components/workers-table";
import { getWorkerCounts, getWorkerList } from "@/lib/worker-queries";

export const dynamic = "force-dynamic";

export default async function WorkersPage() {
  const [rows, counts] = await Promise.all([
    getWorkerList(),
    getWorkerCounts(),
  ]);

  return (
    <>
      <PageHeader
        title="Workers"
        description="Maintain field workers, payment basis, assignments and payment history."
        action={
          <Link href="/admin/workers/new" className="button button-primary">
            + Add Worker
          </Link>
        }
      />

      <div className="lead-stats">
        <StatCard label="Active Workers" value={Number((counts as any).active_count || 0)} />
        <StatCard label="Painters" value={Number((counts as any).painter_count || 0)} />
        <StatCard label="Helpers" value={Number((counts as any).helper_count || 0)} />
        <StatCard label="Supervisors" value={Number((counts as any).supervisor_count || 0)} />
      </div>

      <WorkersTable rows={rows as any} />
    </>
  );
}
