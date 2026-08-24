import React from "react";
import Pagination from "../../tables/Pagination";

interface TableFooterProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalCount: number;
  pageSize: number;
}

const TableFooter: React.FC<TableFooterProps> = ({
  page,
  totalPages,
  onPageChange,
  totalCount,
  pageSize,
}) => {
  if (totalCount === 0) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalCount);

  return (
    <div className="flex items-center justify-between border-t border-gray-200 px-4 py-2.5 dark:border-white/[0.05]">
      <span className="text-[12px] text-gray-400">
        Showing {start}-{end} of {totalCount}
      </span>
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
    </div>
  );
};

export default TableFooter;
