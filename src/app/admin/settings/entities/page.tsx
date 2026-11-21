import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { sql } from "@/lib/db";
import { ACCESS, requireRoles } from "@/lib/auth/permissions";
import { saveEntityProfile } from "./actions";

export const dynamic="force-dynamic";

export default async function BusinessEntitiesPage() {
  await requireRoles(ACCESS.settings);
  const entities = await sql`
    SELECT * FROM public.business_entities ORDER BY CASE code
      WHEN 'unique_ads' THEN 1 ELSE 2 END
  `;
  return <>
    <PageHeader title="Receiving Business Entities"
      description="Maintain separate legal, tax, contact and payment information for Unique Ads and Unique Advertisers. No information is copied between entities."
      action={<Link href="/admin/settings" className="button button-secondary">Back to Settings</Link>}/>
    <p style={{marginBottom:16}}>Only the verified details entered here should be used on documents for the corresponding entity. Do not enter another company's GSTIN or bank account.</p>
    <div style={{display:"grid",gap:24}}>
      {entities.map((e:any)=>(
        <form key={e.code} action={saveEntityProfile} className="form-card">
          <input type="hidden" name="code" value={e.code}/>
          <div className="form-section-title"><div><h2>{e.display_name}</h2><p>Separate legal identity, GST and bank account information.</p></div></div>
          <div className="form-grid">
            <label><span>Legal Entity Name</span><input name="legal_name" defaultValue={e.legal_name||""}/></label>
            <label><span>GSTIN</span><input name="gstin" defaultValue={e.gstin||""} maxLength={15}/></label>
            <label><span>PAN</span><input name="pan" defaultValue={e.pan||""} maxLength={10}/></label>
            <label><span>Phone</span><input name="phone" defaultValue={e.phone||""}/></label>
            <label><span>Email</span><input name="email" type="email" defaultValue={e.email||""}/></label>
            <label className="full"><span>Registered / Business Address</span><textarea name="address" rows={2} defaultValue={e.address||""}/></label>
            <label><span>Bank Name</span><input name="bank_name" defaultValue={e.bank_name||""}/></label>
            <label><span>Bank Account Name</span><input name="bank_account_name" defaultValue={e.bank_account_name||""}/></label>
            <label><span>Bank Account Number</span><input name="bank_account_number" defaultValue={e.bank_account_number||""}/></label>
            <label><span>IFSC</span><input name="ifsc_code" defaultValue={e.ifsc_code||""}/></label>
            <label><span>UPI ID</span><input name="upi_id" defaultValue={e.upi_id||""}/></label>
          </div>
          <div className="form-actions"><button className="button button-primary" type="submit">Save {e.display_name} Details</button></div>
        </form>
      ))}
    </div>
  </>;
}
