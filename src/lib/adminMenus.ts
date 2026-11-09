// Single source of truth for panel menus. `key` is what admin_roles.menus stores.
// Adding a page = add it here (and to the sidebar icon map) and it becomes assignable to roles.

export type MenuDef = {
  key: string;
  name: string;
  path: string;
  group: "Overview" | "Market Data" | "Users & Requests" | "Content" | "Communication";
};

export const MENUS: MenuDef[] = [
  { key: "financials_explorer", name: "Financials Explorer", path: "/Financials_Explorer", group: "Overview" },
  { key: "sectors", name: "Sectors", path: "/Sectors", group: "Market Data" },
  { key: "sectors_iel", name: "Sectors (IEL)", path: "/Sectors_iel", group: "Market Data" },
  { key: "banks", name: "Banks", path: "/Banks", group: "Market Data" },
  { key: "stock_logos", name: "Stock Logos", path: "/StockLogos", group: "Market Data" },
  { key: "research_report", name: "Research Report", path: "/Reseach_Report", group: "Market Data" },
  { key: "symbol_research", name: "Symbol Research Report", path: "/Symbol_Reseach_Report", group: "Market Data" },
  { key: "research_iel", name: "Research Report (IEL)", path: "/Reseach_Report_iel", group: "Market Data" },
  { key: "iel_info", name: "IEL Info", path: "/IelInfo", group: "Market Data" },
  { key: "iel_timing", name: "IEL Timing", path: "/IelTiming", group: "Market Data" },
  { key: "economic_calender", name: "Economic Calender", path: "/economic_calender", group: "Market Data" },
  { key: "financial_statements", name: "Financial Statements", path: "/Finanicial_sttaements", group: "Market Data" },
  { key: "users", name: "Users", path: "/Users", group: "Users & Requests" },
  { key: "withdrawal_requests", name: "Withdrawal Requests", path: "/Withdrawal_Requests", group: "Users & Requests" },
  { key: "raast_ids", name: "Raast IDs", path: "/RaastIds", group: "Users & Requests" },
  { key: "contact", name: "Contact", path: "/Contact", group: "Users & Requests" },
  { key: "blogs", name: "Blogs", path: "/Blogs", group: "Content" },
  { key: "news", name: "News", path: "/News", group: "Content" },
  { key: "banner", name: "Marketing banner", path: "/banner", group: "Content" },
  { key: "notification", name: "Notification", path: "/Notification", group: "Content" },
  { key: "chat_history", name: "AI Chat", path: "/chat_history", group: "Communication" },
];

export const ADMIN_USERS_PATH = "/AdminUsers"; // Super Admin only, never assignable
export const ALWAYS_ALLOWED_PATHS = ["/profile"];

export type Access = {
  role: string | null;
  menus: string[];
  is_super: boolean;
  email?: string;
  full_name?: string;
};

const norm = (p: string) => p.replace(/\/+$/, "").toLowerCase() || "/";

export function menuForPath(pathname: string): MenuDef | undefined {
  const p = norm(pathname);
  return MENUS.find((m) => norm(m.path) === p);
}

export function canSeeMenu(access: Access | null, key: string): boolean {
  if (!access || !access.role) return false;
  return access.is_super || access.menus.includes("*") || access.menus.includes(key);
}

export function canAccessPath(access: Access | null, pathname: string): boolean {
  if (!access || !access.role) return false;
  if (access.is_super) return true;
  const p = norm(pathname);
  if (ALWAYS_ALLOWED_PATHS.some((a) => norm(a) === p)) return true;
  const menu = menuForPath(pathname);
  return !!menu && canSeeMenu(access, menu.key);
}

/** Where to land a user: Users for super, otherwise their first permitted menu. */
export function homePath(access: Access | null): string {
  if (!access || !access.role) return "/signin";
  if (access.is_super) return "/Users";
  const first = MENUS.find((m) => canSeeMenu(access, m.key));
  return first ? first.path : "/profile";
}
