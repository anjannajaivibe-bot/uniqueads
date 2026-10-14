"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Row = {
  id: string;
  worker_code: string | null;
  name: string;
  phone: string | null;
  skill: string;
  state: string | null;
  payment_mode: string;
  default_rate: string | number | null;
  is_active: boolean;
  active_assignments: number;
  agreed_total: string | number;
  paid_total: string | number;
};

function label(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function currency(value: unknown) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export function WorkersTable({ rows }: { rows: Row[] }) {
  const [query, setQuery] = useState("");
  const [skill, setSkill] = useState("all");
  const [status, setStatus] = useState("active");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return rows.filter((row) => {
      const haystack = [
        row.worker_code,
        row.name,
        row.phone,
        row.skill,
        row.state,
        row.payment_mode,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        (!q || haystack.includes(q)) &&
        (skill === "all" || row.skill === skill) &&
        (
          status === "all" ||
          (status === "active" && row.is_active) ||
          (status === "inactive" && !row.is_active)
        )
      );
    });
  }, [rows, query, skill, status]);

  return (
    <section className="panel">
      <div className="lead-toolbar workers-toolbar">
        <div className="lead-search">
          <label htmlFor="worker-search">Search workers</label>
          <input
            id="worker-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Worker code, name, phone, state..."
          />
        </div>

        <label>
          <span>Skill</span>
          <select value={skill} onChange={(e) => setSkill(e.target.value)}>
            <option value="all">All skills</option>
            <option value="painter">Painter</option>
            <option value="helper">Helper</option>
            <option value="supervisor">Supervisor</option>
            <option value="driver">Driver</option>
            <option value="installer">Installer</option>
            <option value="other">Other</option>
          </select>
        </label>

        <label>
          <span>Status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="all">All</option>
          </select>
        </label>
      </div>

      <div className="lead-result-bar">
        <strong>{filtered.length}</strong> of {rows.length} workers
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Worker</th>
              <th>Skill</th>
              <th>State</th>
              <th>Payment Basis</th>
              <th>Assignments</th>
              <th>Tracked Payment</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="empty-cell">
                  No workers match the current filters.
                </td>
              </tr>
            ) : (
              filtered.map((row) => {
                const agreed = Number(row.agreed_total || 0);
                const paid = Number(row.paid_total || 0);
                const balance = Math.max(0, agreed - paid);

                return (
                  <tr key={row.id}>
                    <td>
                      <Link href={`/admin/workers/${row.id}`} className="lead-number">
                        {row.worker_code || "Worker"}
                      </Link>
                      <div><strong>{row.name}</strong></div>
                      <div className="table-subtext">{row.phone || "No phone"}</div>
                    </td>
                    <td>{label(row.skill)}</td>
                    <td>{row.state || "Not set"}</td>
                    <td>
                      <strong>{label(row.payment_mode)}</strong>
                      <div className="table-subtext">
                        {row.default_rate ? currency(row.default_rate) : "Rate not set"}
                      </div>
                    </td>
                    <td>{row.active_assignments}</td>
                    <td>
                      <strong>{currency(paid)}</strong>
                      {agreed > 0 ? (
                        <div className="table-subtext">
                          Balance {currency(balance)}
                        </div>
                      ) : (
                        <div className="table-subtext">No agreed total</div>
                      )}
                    </td>
                    <td>
                      <span className={`status ${row.is_active ? "status-completed" : "status-cancelled"}`}>
                        {row.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="align-right">
                      <Link
                        href={`/admin/workers/${row.id}`}
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
    </section>
  );
}
