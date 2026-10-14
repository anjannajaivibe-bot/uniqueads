import type { ReactNode } from "react";

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  );
}

export function StatCard({ label, value, note }: { label: string; value: ReactNode; note?: string }) {
  return (
    <article className="stat-card">
      <span className="stat-label">{label}</span>
      <strong className="stat-value">{value}</strong>
      {note ? <span className="stat-note">{note}</span> : null}
    </article>
  );
}

export function Status({ value }: { value: string }) {
  const label = value.replaceAll("_", " ");
  return <span className={`status status-${value}`}>{label}</span>;
}

export function EmptyState({ text }: { text: string }) {
  return <div className="empty-state">{text}</div>;
}
