"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { TablePagination } from "@/components/table-pagination";

type LeadRow = {
  id: string;
  lead_no: string;
  company_name: string | null;
  contact_person: string;
  phone: string;
  whatsapp: string | null;
  email: string | null;
  location: string | null;
  advertising_type: string | null;
  number_of_locations: number | null;
  estimated_wall_area_sqft: string | number | null;
  source: string;
  status: string;
  next_follow_up_at: string | Date | null;
  assigned_to_name: string | null;
  created_at: string | Date;
};

function label(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDateTime(value: string | Date | null) {
  if (!value) return "Not scheduled";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Not scheduled";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function isOverdue(value: string | Date | null, status: string) {
  if (!value || status === "won" || status === "lost") return false;
  return new Date(value).getTime() < Date.now();
}

const PAGE_SIZE = 50;

export function LeadsTable({ leads }: { leads: LeadRow[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [source, setSource] = useState("all");
  const [followup, setFollowup] = useState("all");

  const sources = useMemo(
    () => Array.from(new Set(leads.map((lead) => lead.source))).sort(),
    [leads]
  );

  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return leads.filter((lead) => {
      const haystack = [
        lead.lead_no,
        lead.company_name,
        lead.contact_person,
        lead.phone,
        lead.whatsapp,
        lead.email,
        lead.location,
        lead.advertising_type,
        lead.assigned_to_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesQuery = !q || haystack.includes(q);
      const matchesStatus = status === "all" || lead.status === status;
      const matchesSource = source === "all" || lead.source === source;
      const overdue = isOverdue(lead.next_follow_up_at, lead.status);
      const matchesFollowup =
        followup === "all" ||
        (followup === "overdue" && overdue) ||
        (followup === "scheduled" && Boolean(lead.next_follow_up_at) && !overdue) ||
        (followup === "unscheduled" && !lead.next_follow_up_at);

      return matchesQuery && matchesStatus && matchesSource && matchesFollowup;
    });
  }, [leads, query, status, source, followup]);

  useEffect(() => {
    setPage(1);
  }, [query, status, source, followup]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  return (
    <section className="panel">
      <div className="lead-toolbar">
        <div className="lead-search">
          <label htmlFor="lead-search">Search leads</label>
          <input
            id="lead-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Lead no, company, person, phone, location..."
          />
        </div>

        <label>
          <span>Status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="requirement_received">Requirement Received</option>
            <option value="quotation_sent">Quotation Sent</option>
            <option value="negotiation">Negotiation</option>
            <option value="won">Won</option>
            <option value="lost">Lost</option>
          </select>
        </label>

        <label>
          <span>Source</span>
          <select value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="all">All sources</option>
            {sources.map((item) => (
              <option key={item} value={item}>
                {label(item)}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Follow-up</span>
          <select value={followup} onChange={(e) => setFollowup(e.target.value)}>
            <option value="all">All follow-ups</option>
            <option value="overdue">Overdue</option>
            <option value="scheduled">Scheduled</option>
            <option value="unscheduled">Not scheduled</option>
          </select>
        </label>
      </div>

      <div className="lead-result-bar">
        <strong>{filtered.length}</strong> of {leads.length} leads
        {(query || status !== "all" || source !== "all" || followup !== "all") && (
          <button
            type="button"
            className="filter-reset"
            onClick={() => {
              setQuery("");
              setStatus("all");
              setSource("all");
              setFollowup("all");
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="table-wrap">
        <table className="leads-table">
          <thead>
            <tr>
              <th>Lead</th>
              <th>Company / Contact</th>
              <th>Requirement</th>
              <th>Source</th>
              <th>Status</th>
              <th>Assigned</th>
              <th>Next Follow-up</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="empty-cell">
                  No leads match the current filters.
                </td>
              </tr>
            ) : (
              pageRows.map((lead) => {
                const overdue = isOverdue(lead.next_follow_up_at, lead.status);

                return (
                  <tr key={lead.id}>
                    <td>
                      <Link href={`/admin/leads/${lead.id}`} className="lead-number">
                        {lead.lead_no}
                      </Link>
                    </td>
                    <td>
                      <strong>{lead.company_name || lead.contact_person}</strong>
                      <div className="table-subtext">
                        {lead.company_name ? lead.contact_person : lead.phone}
                      </div>
                      {lead.company_name ? (
                        <div className="table-subtext">{lead.phone}</div>
                      ) : null}
                    </td>
                    <td>
                      <div>{lead.advertising_type || "Not specified"}</div>
                      <div className="table-subtext">
                        {lead.location || "Location not specified"}
                      </div>
                    </td>
                    <td className="capitalize">{label(lead.source)}</td>
                    <td>
                      <span className={`status status-${lead.status}`}>
                        {label(lead.status)}
                      </span>
                    </td>
                    <td>{lead.assigned_to_name || "Unassigned"}</td>
                    <td>
                      <span className={overdue ? "followup-overdue" : ""}>
                        {formatDateTime(lead.next_follow_up_at)}
                      </span>
                      {overdue ? <div className="overdue-label">Overdue</div> : null}
                    </td>
                    <td className="align-right">
                      <Link
                        href={`/admin/leads/${lead.id}`}
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
