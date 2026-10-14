import Link from "next/link";
import { PageHeader, StatCard } from "@/components/ui";
import { QuotationsTable } from "@/components/quotations-table";
import { getQuotationCounts, getQuotationList } from "@/lib/quotation-queries";

export const dynamic = "force-dynamic";

function currency(value: unknown) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export default async function QuotationsPage() {
  const [rows, counts] = await Promise.all([
    getQuotationList(),
    getQuotationCounts(),
  ]);

  const safeRows = rows.map((row: any) => ({
    ...row,
    quotation_date: row.quotation_date
      ? new Date(row.quotation_date).toISOString()
      : null,
    valid_until: row.valid_until ? new Date(row.valid_until).toISOString() : null,
  }));

  return (
    <>
      <PageHeader
        title="Quotations"
        description="Prepare, approve and convert commercial offers into confirmed orders without re-entering the job."
        action={
          <Link href="/admin/quotations/new" className="button button-primary">
            + New Quotation
          </Link>
        }
      />

      <div className="lead-stats">
        <StatCard label="Draft" value={Number((counts as any).draft_count || 0)} />
        <StatCard label="Sent" value={Number((counts as any).sent_count || 0)} />
        <StatCard label="Accepted" value={Number((counts as any).accepted_count || 0)} />
        <StatCard
          label="This Month"
          value={currency((counts as any).month_value)}
          note="Quotation value"
        />
      </div>

      <QuotationsTable rows={safeRows as any} />
    </>
  );
}
