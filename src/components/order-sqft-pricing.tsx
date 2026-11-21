"use client";

import { useMemo, useState } from "react";

export function OrderSqftPricing() {
  const [area, setArea] = useState("");
  const [rate, setRate] = useState("");
  const total = useMemo(() => {
    const a = Number(area), r = Number(rate);
    return area && rate && Number.isFinite(a) && Number.isFinite(r) && a > 0 && r >= 0
      ? Math.round(a * r * 100) / 100 : 0;
  }, [area, rate]);

  return (
    <>
      <label>
        <span>Total Work Area (sq.ft) *</span>
        <input name="contract_area_sqft" type="number" min="0.01" step="0.01"
          required value={area} onChange={(e) => setArea(e.target.value)}
          placeholder="Example: 12000" />
      </label>
      <label>
        <span>Company Rate per sq.ft (₹) *</span>
        <input name="client_rate_per_sqft" type="number" min="0" step="0.01"
          required value={rate} onChange={(e) => setRate(e.target.value)}
          placeholder="Example: 15.00" />
      </label>
      <div className="full" role="status" aria-live="polite" style={{
        padding: 14, background: "#f3f6fa", borderRadius: 10, display: "grid", gap: 4,
      }}>
        <span style={{fontSize:13}}>Calculated Company Work Order Value</span>
        <strong style={{fontSize:24}}>{new Intl.NumberFormat("en-IN", {style:"currency",currency:"INR"}).format(total)}</strong>
        <small>Total area × agreed rate per sq.ft. Finance records every receipt separately.</small>
      </div>
    </>
  );
}
