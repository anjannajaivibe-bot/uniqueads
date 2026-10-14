"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { TablePagination } from "@/components/table-pagination";

type Row = {
  id: string;
  quotation_no: string;
  quotation_date: string | Date;
  valid_until: string | Date | null;
  status: string;
  grand_total: string | number;
  company_name: string | null;
  lead_no: string | null;
  contact_person: string | null;
  phone: string | null;
};

function currency(value: string | number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
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

function label(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const PAGE_SIZE = 50;

export function QuotationsTable({ rows }: { rows: Row[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");

  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return rows.filter((row) => {
      const haystack = [
        row.quotation_no,
        row.company_name,
        row.lead_no,
        row.contact_person,
        row.phone,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        (!q || haystack.includes(q)) &&
        (status === "all" || row.status === status)
      );
    });
  }, [rows, query, status]);

  useEffect(() => {
    setPage(1);
  }, [query, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  return (
    <section className="panel">
      <div className="lead-toolbar quote-toolbar">
        <div className="lead-search">
          <label htmlFor="quotation-search">Search quotations</label>
          <input
            id="quotation-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Quotation no, customer, lead, phone..."
          />
        </div>
        <label>
          <span>Status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
            <option value="expired">Expired</option>
            <option value="converted">Converted</option>
          </select>
        </label>
      </div>

      <div className="lead-result-bar">
        <strong>{filtered.length}</strong> of {rows.length} quotations
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Quotation</th>
              <th>Customer / Lead</th>
              <th>Date</th>
              <th>Valid Until</th>
              <th>Status</th>
              <th className="align-right">Value</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="empty-cell">
                  No quotations match the current filters.
                </td>
              </tr>
            ) : (
              pageRows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <Link href={`/admin/quotations/${row.id}`} className="mono">
                      {row.quotation_no}
                    </Link>
                  </td>
                  <td>
                    <strong>{row.company_name || row.contact_person || "Lead"}</strong>
                    {row.lead_no ? (
                      <div className="table-subtext">{row.lead_no}</div>
                    ) : null}
                  </td>
                  <td>{date(row.quotation_date)}</td>
                  <td>{date(row.valid_until)}</td>
                  <td>
                    <span className={`status status-${row.status}`}>
                      {label(row.status)}
                    </span>
                  </td>
                  <td className="align-right"><strong>{currency(row.grand_total)}</strong></td>
                  <td className="align-right">
                    <Link
                      href={`/admin/quotations/${row.id}`}
                      className="button button-compact button-secondary"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))
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
