import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { PrintButton } from "@/components/print-button";
import { ACCESS, requireRoles } from "@/lib/auth/permissions";
import { sql } from "@/lib/db";
import { presignWorkPhotoDownload } from "@/lib/storage";

export const dynamic = "force-dynamic";

function date(value: unknown) {
  if (!value) return "-";
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? "-" : new Intl.DateTimeFormat("en-IN",{
    day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit",timeZone:"Asia/Kolkata"
  }).format(d);
}

export default async function WorkPhotoReport({searchParams}: {
  searchParams: Promise<{order?:string}>;
}) {
  await requireRoles(ACCESS.reports);
  const params=await searchParams;
  const orders=await sql`
    SELECT o.id,o.order_no,o.client_work_order_no,o.entity_code,o.contract_area_sqft,
      o.total_order_amount,c.company_name
    FROM orders o JOIN customers c ON c.id=o.customer_id
    ORDER BY o.created_at DESC LIMIT 250
  `;
  const selected=orders.find((o:any)=>String(o.id)===params.order) as any;
  let photos:any[]=[];
  if(selected) {
    const records=await sql`
      SELECT wp.id,wp.photo_type,wp.file_url,wp.caption,wp.latitude,wp.longitude,
        wp.gps_accuracy_m,wp.device_captured_at,wp.server_received_at,
        wp.completed_area_sqft,wp.is_live_capture,
        ol.location_name,ol.city,ol.district,ol.state,ol.area_sqft,ol.verified_at
      FROM work_photos wp
      JOIN order_locations ol ON ol.id=wp.order_location_id
      WHERE wp.order_id=${selected.id}::uuid
      ORDER BY ol.location_name,wp.created_at DESC LIMIT 300
    `;
    photos=await Promise.all(records.map(async (p:any)=>({
      ...p,photo_url:await presignWorkPhotoDownload(String(p.file_url))
    })));
  }
  return <div className="print-document-shell">
    <div className="no-print">
      <PageHeader title="GPS Work Photo Report"
        description="Export printable evidence with camera image, coordinates, square feet, work stage, and server timestamps."
        action={<Link href="/admin/reports" className="button button-secondary">Back to Reports</Link>}/>
      <section className="panel" style={{marginBottom:24}}>
        <form method="get" className="form-grid">
          <label className="full"><span>Select Work Order</span>
            <select name="order" defaultValue={selected?.id||""} required>
              <option value="">Choose company work order</option>
              {orders.map((o:any)=><option key={o.id} value={o.id}>
                {o.company_name} · {o.client_work_order_no || o.order_no} · {o.entity_code==="unique_advertisers"?"Unique Advertisers":"Unique Ads"}
              </option>)}
            </select>
          </label>
          <div className="form-actions full">
            <button type="submit" className="button button-secondary">Generate Photo Report</button>
            {selected ? <PrintButton/> : null}
          </div>
        </form>
      </section>
    </div>
    {selected ? <>
      <article className="panel" style={{padding:24}}>
        <h1 style={{margin:"0 0 8px"}}>GPS Field Work Evidence</h1>
        <p style={{margin:0}}><strong>{selected.entity_code==="unique_advertisers"?"Unique Advertisers":"Unique Ads"}</strong> · {selected.company_name}</p>
        <p>Company Work Order: {selected.client_work_order_no || "-"} · ERP: {selected.order_no}</p>
        <p>Contracted Area: {selected.contract_area_sqft ? Number(selected.contract_area_sqft).toLocaleString("en-IN")+" sq.ft" : "Legacy order"}</p>
        <p>{photos.length} evidence photo(s). All times India Standard Time (IST).</p>
      </article>
      {photos.length===0 ? <section className="panel" style={{padding:24,marginTop:16}}>No saved work photos for this order.</section> : (
        <section style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,320px),1fr))",gap:18,marginTop:18}}>
          {photos.map((p:any)=><article key={p.id} className="panel" style={{padding:14,breakInside:"avoid"}}>
            <h2 style={{fontSize:18,margin:"0 0 4px"}}>{p.location_name}</h2>
            <p style={{margin:"0 0 8px"}}>{[p.city,p.district,p.state].filter(Boolean).join(", ") || "Address not recorded"} · {p.photo_type}</p>
            <img src={p.photo_url} alt={`GPS work evidence ${p.location_name}`}
              style={{display:"block",width:"100%",height:"auto",maxHeight:340,objectFit:"contain",background:"#eef2f7"}}/>
            <p><strong>Recorded work:</strong> {p.completed_area_sqft !== null ? Number(p.completed_area_sqft).toLocaleString("en-IN")+" sq.ft" : "Legacy proof"} / {Number(p.area_sqft||0).toLocaleString("en-IN")} sq.ft</p>
            <p><strong>GPS:</strong> {p.latitude !== null && p.longitude !== null ? `${p.latitude}, ${p.longitude}` : "Not recorded"}</p>
            <p><strong>Accuracy:</strong> {p.gps_accuracy_m ? `±${Math.round(Number(p.gps_accuracy_m))} metres` : "Not recorded"}</p>
            <p><strong>Camera time:</strong> {date(p.device_captured_at)}</p>
            <p><strong>ERP received:</strong> {date(p.server_received_at)}</p>
            <p><strong>Unique Ads verified:</strong> {date(p.verified_at)}</p>
            {p.latitude !== null && p.longitude !== null ? <a href={`https://www.google.com/maps?q=${p.latitude},${p.longitude}`}
              target="_blank" rel="noreferrer">View Map Location</a> : null}
          </article>)}
        </section>
      )}
    </> : null}
  </div>;
}
