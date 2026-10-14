"use client";

type TablePaginationProps = {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
};

export function TablePagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
}: TablePaginationProps) {
  if (totalItems === 0) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(totalItems, page * pageSize);

  return (
    <div className="table-pagination" aria-label="Table pagination">
      <span>
        Showing <strong>{start}-{end}</strong> of <strong>{totalItems}</strong>
      </span>

      <div className="table-pagination-controls">
        <button
          type="button"
          className="button button-compact button-secondary"
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
        >
          Previous
        </button>
        <span>
          Page <strong>{page}</strong> of <strong>{totalPages}</strong>
        </span>
        <button
          type="button"
          className="button button-compact button-secondary"
          disabled={page >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        >
          Next
        </button>
      </div>
    </div>
  );
}
