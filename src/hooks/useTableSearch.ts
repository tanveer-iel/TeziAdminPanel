import { useMemo, useState } from "react";

export function useTableSearch<T>(
  items: T[],
  matches: (item: T, query: string) => boolean,
  pageSize = 10
) {
  const [search, setSearchRaw] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => matches(item, q));
  }, [items, search, matches]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const paginated = useMemo(
    () => filtered.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filtered, safePage, pageSize]
  );

  const setSearch = (value: string) => {
    setSearchRaw(value);
    setPage(1);
  };

  return {
    search,
    setSearch,
    page: safePage,
    setPage,
    totalPages,
    paginated,
    filteredCount: filtered.length,
  };
}
