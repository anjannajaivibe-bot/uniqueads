"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { TablePagination } from "@/components/table-pagination";

type Row = {
  id: string;
  order_no: string;
  entity_code: string;
  client_work_order_no: string | null;
  contract_area_sqft: string | number | null;
  campaign_name: string;
  advertising_type: string | null;
  start_date: string | Date | null;
  due_date: string | Date | null;
  status: string;
  total_order_amount: string | number;
  advance_received: string | number;
  company_name: string;
  contact_person: string | null;
  phone: string | null;
  supervisor_name: string | null;
  location_count: number;
  completed_locations: number;
  progress_percent: number;
};

function label(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function date(value: string | Date | null) {
  if (!value) return "Not set";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Not set";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

function currency(value: string | number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function overdue(row: Row) {
  if (!row.due_date) return false;
  if (["completed", "invoiced", "closed", "cancelled"].includes(row.status)) return false;
  return new Date(row.due_date).getTime() < Date.now();
}

const PAGE_SIZE = 50;

export function OrdersTable({ rows }: { rows: Row[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [entity, setEntity] = useState("all");
  const [due, setDue] = useState("all");

  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return rows.filter((row) => {
      const haystack = [
        row.order_no,
        row.client_work_order_no,
        row.entity_code,
        row.campaign_name,
        row.company_name,
        row.contact_person,
        row.phone,
        row.advertising_type,
        row.supervisor_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const isOverdue = overdue(row);

      return (
        (!q || haystack.includes(q)) &&
        (status === "all" || row.status === status) &&
        (entity === "all" || row.entity_code === entity) &&
        (
          due === "all" ||
          (due === "overdue" && isOverdue) ||
          (due === "not_overdue" && !isOverdue)
        )
      );
    });
  }, [rows, query, status, entity, due]);

  useEffect(() => {
    setPage(1);
  }, [query, status, entity, due]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  return (
    <section className="panel">
      <div className="lead-toolbar orders-toolbar">
        <div className="lead-search">
          <label htmlFor="order-search">Search orders</label>
          <input
            id="order-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Company work order, client, campaign, reference..."
          />
        </div>

        <label>
          <span>Status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="order_received">Order Received</option>
            <option value="planning">Planning</option>
            <option value="team_assigned">Team Assigned</option>
            <option value="material_ready">Material Ready</option>
            <option value="work_started">Work Started</option>
            <option value="in_progress">In Progress</option>
            <option value="quality_check">Quality Check</option>
            <option value="customer_approval">Customer Approval</option>
            <option value="completed">Completed</option>
            <option value="invoiced">Invoiced</option>
            <option value="closed">Closed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>

        <label>
          <span>Receiving Entity</span>
          <select value={entity} onChange={(e) => setEntity(e.target.value)}>
            <option value="all">Both Entities</option>
            <option value="unique_ads">Unique Ads</option>
            <option value="unique_advertisers">Unique Advertisers</option>
          </select>
        </label>
        <label>
          <span>Due</span>
          <select value={due} onChange={(e) => setDue(e.target.value)}>
            <option value="all">All</option>
            <option value="overdue">Overdue</option>
            <option value="not_overdue">Not overdue</option>
          </select>
        </label>
      </div>

      <div className="lead-result-bar">
        <strong>{filtered.length}</strong> of {rows.length} orders
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Company WO / ERP</th>
              <th>Entity</th>
              <th>Customer / Campaign</th>
              <th>Due</th>
              <th>Progress</th>
              <th>Assigned Team</th>
              <th>Status</th>
              <th className="align-right">Value</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="empty-cell">
                  No orders match the current filters.
                </td>
              </tr>
            ) : (
              pageRows.map((row) => {
                const isOverdue = overdue(row);

                return (
                  <tr key={row.id}>
                    <td>
                      <Link href={`/admin/orders/${row.id}`} className="mono">
                        {row.client_work_order_no || row.order_no}
                      </Link>
                      {row.client_work_order_no ? <div className="table-subtext">{row.order_no}</div> : null}
                    </td>
                    <td>{row.entity_code === "unique_advertisers" ? "Unique Advertisers" : "Unique Ads"}</td>
                    <td>
                      <strong>{row.company_name}</strong>
                      <div className="table-subtext">{row.campaign_name}</div>
                      {row.contract_area_sqft ? <div className="table-subtext">{Number(row.contract_area_sqft).toLocaleString("en-IN")} sq.ft</div> : null}
                    </td>
                    <td>
                      <span className={isOverdue ? "followup-overdue" : ""}>
                        {date(row.due_date)}
                      </span>
                      {isOverdue ? <div className="overdue-label">Overdue</div> : null}
                    </td>
                    <td>
                      <div className="table-progress">
                        <div className="table-progress-bar">
                          <span style={{ width: `${Math.max(0, Math.min(100, row.progress_percent))}%` }} />
                        </div>
                        <strong>{row.progress_percent}%</strong>
                      </div>
                      <div className="table-subtext">
                        {row.completed_locations} of {row.location_count} locations
                      </div>
                    </td>
                    <td>{row.supervisor_name || "Unassigned"}</td>
                    <td>
                      <span className={`status status-${row.status}`}>
                        {label(row.status)}
                      </span>
                    </td>
                    <td className="align-right"><strong>{currency(row.total_order_amount)}</strong></td>
                    <td className="align-right">
                      <Link
                        href={`/admin/orders/${row.id}`}
                        className="button button-compact button-secondary"
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <TablePagination
        page={currentPage}
        totalPages={totalPages}
        totalItems={filtered.length}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
      />
    </section>
  );
}
