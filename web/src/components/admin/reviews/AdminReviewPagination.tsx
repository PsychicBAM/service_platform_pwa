const PAGE_SIZE_OPTIONS = [8, 10, 25, 50];

type AdminReviewPaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
};

export function AdminReviewPagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: AdminReviewPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const from = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, total);
  const pages = buildPageList(safePage, totalPages);

  return (
    <div
      className="flex flex-col gap-3 border-t border-gray-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
      data-testid="admin-reviews-pagination"
    >
      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
        <p>
          Showing{" "}
          <span className="font-medium text-gray-700">
            {from} to {to}
          </span>{" "}
          of <span className="font-medium text-gray-700">{total}</span> results
        </p>
        <label className="inline-flex items-center gap-2">
          <span className="text-gray-500">Rows per page</span>
          <select
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm font-medium text-gray-700"
            data-testid="admin-reviews-rows-per-page"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <PageButton
          label="‹"
          ariaLabel="Previous page"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
        />
        {pages.map((item, index) =>
          item === "…" ? (
            <span key={`ellipsis-${index}`} className="px-2 text-sm text-gray-400">
              …
            </span>
          ) : (
            <PageButton
              key={item}
              label={String(item)}
              ariaLabel={`Page ${item}`}
              active={item === safePage}
              onClick={() => onPageChange(item)}
            />
          ),
        )}
        <PageButton
          label="›"
          ariaLabel="Next page"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(safePage + 1)}
        />
      </div>
    </div>
  );
}

function PageButton({
  label,
  ariaLabel,
  onClick,
  disabled,
  active,
}: {
  label: string;
  ariaLabel: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      className={`min-h-9 min-w-9 rounded-lg px-2.5 text-sm font-semibold disabled:opacity-40 ${
        active
          ? "bg-emerald-600 text-white"
          : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
      }`}
    >
      {label}
    </button>
  );
}

function buildPageList(current: number, total: number): Array<number | "…"> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }
  const pages: Array<number | "…"> = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push("…");
  for (let page = start; page <= end; page += 1) pages.push(page);
  if (end < total - 1) pages.push("…");
  pages.push(total);
  return pages;
}
