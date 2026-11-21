import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { QuotationBuilder } from "@/components/quotation-builder";
import {
  getCompanySettings,
  getQuotationCustomers,
} from "@/lib/quotation-queries";

export const dynamic = "force-dynamic";

export default async function NewQuotationPage({
  searchParams,
}: {
  searchParams: Promise<{ customer?: string }>;
}) {
  const params = await searchParams;
  const [customers, companySettings] = await Promise.all([
    getQuotationCustomers(),
    getCompanySettings(),
  ]);

  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + 15);
  const defaultValidUntil = validUntil.toISOString().slice(0, 10);

  return (
    <>
      <PageHeader
        title="New Quotation"
        description="Build a clear commercial offer with line items, GST, discount and terms."
        action={
          <Link href="/admin/quotations" className="button button-secondary">
            Back to Quotations
          </Link>
        }
      />

      <QuotationBuilder
        customers={customers as any}
        initialCustomerId={params.customer || ""}
        defaultValidUntil={defaultValidUntil}
        defaultTermsAndConditions={(companySettings as any)?.quotation_terms || ""}
      />
    </>
  );
}

