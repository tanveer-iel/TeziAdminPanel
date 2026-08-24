import React from "react";

interface TableSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const TableSearchBar: React.FC<TableSearchBarProps> = ({
  value,
  onChange,
  placeholder = "Search…",
}) => {
  return (
    <div className="border-b border-gray-200 px-4 py-2.5 dark:border-white/[0.05]">
      <div className="relative max-w-xs">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
        >
          <circle cx="11" cy="11" r="7"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-8 w-full rounded-md border border-gray-200 bg-gray-50 pl-8 pr-3 text-[13px] text-gray-700 outline-none placeholder:text-gray-400 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-200"
        />
      </div>
    </div>
  );
};

export default TableSearchBar;
