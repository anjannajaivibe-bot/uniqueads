"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { TablePagination } from "@/components/table-pagination";

type Row = {
  id: string;
  customer_code: string | null;
  company_name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  gstin: string | null;
  city: string | null;
  state: string | null;
  is_active: boolean;
  order_count: number;
  order_value: string | number;
  invoice_total: string | number;
  received_total: string | number;
};

function currency(value: unknown) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

const PAGE_SIZE = 50;

export function CustomersTable({ rows }: { rows: Row[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("active");
  const [state, setState] = useState("all");

  const states = useMemo(
    () =>
      Array.from(
        new Set(rows.map((row) => row.state).filter(Boolean) as string[])
      ).sort(),
    [rows]
  );

  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return rows.filter((row) => {
      const haystack = [
        row.customer_code,
        row.company_name,
        row.contact_person,
        row.phone,
        row.email,
        row.gstin,
        row.city,
        row.state,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        (!q || haystack.includes(q)) &&
        (
          status === "all" ||
          (status === "active" && row.is_active) ||
          (status === "inactive" && !row.is_active)
        ) &&
        (state === "all" || row.state === state)
      );
    });
  }, [rows, query, status, state]);

  useEffect(() => {
    setPage(1);
  }, [query, status, state]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  return (
    <section className="panel">
      <div className="lead-toolbar customers-toolbar">
        <div className="lead-search">
          <label htmlFor="customer-search">Search customers</label>
          <input
            id="customer-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Customer code, company, phone, GSTIN, city..."
          />
        </div>

        <label>
          <span>Status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="all">All</option>
          </select>
        </label>

        <label>
          <span>State</span>
          <select value={state} onChange={(e) => setState(e.target.value)}>
            <option value="all">All states</option>
            {states.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="lead-result-bar">
        <strong>{filtered.length}</strong> of {rows.length} customers
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Customer</th>
              <th>Contact</th>
              <th>Location</th>
              <th>Orders</th>
              <th className="align-right">Order Value</th>
              <th className="align-right">Received</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="empty-cell">
                  No customers match the current filters.
                </td>
              </tr>
            ) : (
              pageRows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <Link href={`/admin/customers/${row.id}`} className="lead-number">
                      {row.customer_code || "Customer"}
                    </Link>
                    <div><strong>{row.company_name}</strong></div>
                    {row.gstin ? <div className="table-subtext">GSTIN {row.gstin}</div> : null}
                  </td>
                  <td>
                    <strong>{row.contact_person || "Not set"}</strong>
                    <div className="table-subtext">{row.phone || "No phone"}</div>
                  </td>
                  <td>
                    {[row.city, row.state].filter(Boolean).join(", ") || "Not set"}
                  </td>
                  <td>{row.order_count}</td>
                  <td className="align-right"><strong>{currency(row.order_value)}</strong></td>
                  <td className="align-right"><strong>{currency(row.received_total)}</strong></td>
                  <td>
                    <span className={`status ${row.is_active ? "status-completed" : "status-cancelled"}`}>
                      {row.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="align-right">
                    <Link
                      href={`/admin/customers/${row.id}`}
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
