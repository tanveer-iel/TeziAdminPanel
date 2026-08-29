"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import {
  CalenderIcon,
  ChevronDownIcon,
  HorizontaLDots,
  UserCircleIcon,
  ChatIcon,
  DocsIcon,
  PieChartIcon,
  GroupIcon,
  DollarLineIcon,
  BoxIcon,
  PageIcon,
  FileIcon,
  InfoIcon,
  TimeIcon,
  ListIcon,
  ArrowDownIcon,
  PlugInIcon,
  MailIcon,
  FolderIcon,
  PaperPlaneIcon,
  ShootingStarIcon,
  BellIcon,
  GridIcon,
} from "../icons/index";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { name: string; path: string; pro?: boolean; new?: boolean }[];
};

type NavGroup = {
  label: string;
  key: string;
  items: NavItem[];
};

const topLevelItems: NavItem[] = [
  { name: "Financials Explorer", icon: <GridIcon />, path: "/Financials_Explorer" },
];

const navGroups: NavGroup[] = [
  {
    label: "Market Data",
    key: "market",
    items: [
      { name: "Sectors", icon: <PieChartIcon />, path: "/Sectors" },
      { name: "Sectors (IEL)", icon: <GroupIcon />, path: "/Sectors_iel" },
      { name: "Banks", icon: <DollarLineIcon />, path: "/Banks" },
      { name: "Stock Logos", icon: <BoxIcon />, path: "/StockLogos" },
      { name: "Research Report", icon: <DocsIcon />, path: "/Reseach_Report" },
      { name: "Symbol Research Report", icon: <PageIcon />, path: "/Symbol_Reseach_Report" },
      { name: "Research Report (IEL)", icon: <FileIcon />, path: "/Reseach_Report_iel" },
      { name: "IEL Info", icon: <InfoIcon />, path: "/IelInfo" },
      { name: "IEL Timing", icon: <TimeIcon />, path: "/IelTiming" },
      { name: "Economic Calender", icon: <CalenderIcon />, path: "/economic_calender" },
      { name: "Financial Statements", icon: <ListIcon />, path: "/Finanicial_sttaements" },
    ],
  },
  {
    label: "Users & Requests",
    key: "users",
    items: [
      { name: "Users", icon: <UserCircleIcon />, path: "/Users" },
      { name: "Withdrawal Requests", icon: <ArrowDownIcon />, path: "/Withdrawal_Requests" },
      { name: "Raast IDs", icon: <PlugInIcon />, path: "/RaastIds" },
      { name: "Contact", icon: <MailIcon />, path: "/Contact" },
    ],
  },
  {
    label: "Content",
    key: "content",
    items: [
      { name: "Blogs", icon: <FolderIcon />, path: "/Blogs" },
      { name: "News", icon: <PaperPlaneIcon />, path: "/News" },
      { name: "Marketing banner", icon: <ShootingStarIcon />, path: "/banner" },
      { name: "Notification", icon: <BellIcon />, path: "/Notification" },
    ],
  },
  {
    label: "Communication",
    key: "comms",
    items: [{ name: "AI Chat", icon: <ChatIcon />, path: "/chat_history" }],
  },
];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();

  const [openSubmenu, setOpenSubmenu] = useState<{
    group: string;
    index: number;
  } | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>(
    {}
  );
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const isActive = useCallback((path: string) => path === pathname, [pathname]);

  useEffect(() => {
    let submenuMatched = false;
    navGroups.forEach((group) => {
      group.items.forEach((nav, index) => {
        if (nav.subItems) {
          nav.subItems.forEach((subItem) => {
            if (isActive(subItem.path)) {
              setOpenSubmenu({ group: group.key, index });
              submenuMatched = true;
            }
          });
        }
      });
    });

    if (!submenuMatched) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- this only clears already-open submenu UI state in response to a route change, not derivable during render
      setOpenSubmenu(null);
    }
  }, [pathname, isActive]);

  useEffect(() => {
    if (openSubmenu !== null) {
      const key = `${openSubmenu.group}-${openSubmenu.index}`;
      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prevHeights) => ({
          ...prevHeights,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }));
      }
    }
  }, [openSubmenu]);

  const handleSubmenuToggle = (index: number, groupKey: string) => {
    setOpenSubmenu((prevOpenSubmenu) => {
      if (
        prevOpenSubmenu &&
        prevOpenSubmenu.group === groupKey &&
        prevOpenSubmenu.index === index
      ) {
        return null;
      }
      return { group: groupKey, index };
    });
  };

  const showLabels = isExpanded || isHovered || isMobileOpen;

  const renderMenuItems = (group: NavGroup) => (
    <ul className="flex flex-col gap-0.5">
      {group.items.map((nav, index) => (
        <li key={nav.name}>
          {nav.subItems ? (
            <button
              onClick={() => handleSubmenuToggle(index, group.key)}
              className={`menu-item group ${
                openSubmenu?.group === group.key && openSubmenu?.index === index
                  ? "menu-item-active"
                  : "menu-item-inactive"
              } cursor-pointer !py-2 !text-[13px] ${
                !isExpanded && !isHovered ? "lg:justify-center" : "lg:justify-start"
              }`}
            >
              <span
                className={`${
                  openSubmenu?.group === group.key && openSubmenu?.index === index
                    ? "menu-item-icon-active"
                    : "menu-item-icon-inactive"
                } [&>svg]:h-4 [&>svg]:w-4`}
              >
                {nav.icon}
              </span>
              {showLabels && <span className="menu-item-text">{nav.name}</span>}
              {showLabels && (
                <ChevronDownIcon
                  className={`ml-auto w-4 h-4 transition-transform duration-200 ${
                    openSubmenu?.group === group.key && openSubmenu?.index === index
                      ? "rotate-180 text-brand-500"
                      : ""
                  }`}
                />
              )}
            </button>
          ) : (
            nav.path && (
              <Link
                href={nav.path}
                className={`menu-item group !py-2 !text-[13px] ${
                  isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
                }`}
              >
                <span
                  className={`${
                    isActive(nav.path) ? "menu-item-icon-active" : "menu-item-icon-inactive"
                  } [&>svg]:h-4 [&>svg]:w-4`}
                >
                  {nav.icon}
                </span>
                {showLabels && <span className="menu-item-text">{nav.name}</span>}
              </Link>
            )
          )}
          {nav.subItems && showLabels && (
            <div
              ref={(el) => {
                subMenuRefs.current[`${group.key}-${index}`] = el;
              }}
              className="overflow-hidden transition-all duration-300"
              style={{
                height:
                  openSubmenu?.group === group.key && openSubmenu?.index === index
                    ? `${subMenuHeight[`${group.key}-${index}`]}px`
                    : "0px",
              }}
            >
              <ul className="mt-1 space-y-0.5 ml-8">
                {nav.subItems.map((subItem) => (
                  <li key={subItem.name}>
                    <Link
                      href={subItem.path}
                      className={`menu-dropdown-item !py-2 !text-[13px] ${
                        isActive(subItem.path)
                          ? "menu-dropdown-item-active"
                          : "menu-dropdown-item-inactive"
                      }`}
                    >
                      {subItem.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </li>
      ))}
    </ul>
  );

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200
        ${isExpanded || isMobileOpen ? "w-[236px]" : isHovered ? "w-[236px]" : "w-[76px]"}
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`h-14 flex items-center flex-shrink-0 border-b border-gray-200 dark:border-gray-800 px-5 gap-2 ${
          !isExpanded && !isHovered ? "lg:justify-center lg:px-0" : "justify-start"
        }`}
      >
        <Link href="/Users" className="flex items-center gap-2">
          {showLabels ? (
            <>
              <Image
                className="dark:hidden"
                src="/images/logo/black_logo.png"
                alt="Logo"
                width={26}
                height={26}
              />
              <Image
                className="hidden dark:block"
                src="/images/logo/white_logo.png"
                alt="Logo"
                width={26}
                height={26}
              />
              <span className="text-[14px] font-semibold text-gray-900 dark:text-white/90">
                Tezi Admin
              </span>
            </>
          ) : (
            <Image
              src="/images/logo/logo-icon.svg"
              alt="Logo"
              width={26}
              height={26}
            />
          )}
        </Link>
      </div>
      <div className="flex flex-col flex-1 overflow-y-auto duration-300 ease-linear no-scrollbar px-3 py-4">
        <nav className="flex flex-col gap-4">
          <div>{renderMenuItems({ label: "", key: "standalone", items: topLevelItems })}</div>
          <div className="border-t border-gray-200 dark:border-gray-800" />
          {navGroups.map((group) => {
            const isCollapsed = showLabels && collapsedGroups[group.key];
            return (
              <div key={group.key}>
                {showLabels ? (
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.key)}
                    className="mb-1.5 flex w-full items-center justify-between px-2 text-[11px] font-semibold uppercase tracking-wide leading-[16px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <span>{group.label}</span>
                    <ChevronDownIcon
                      className={`h-3.5 w-3.5 transition-transform duration-200 ${
                        isCollapsed ? "-rotate-90" : ""
                      }`}
                    />
                  </button>
                ) : (
                  <h2 className="mb-1.5 flex justify-center px-2 text-[11px] font-semibold uppercase tracking-wide leading-[16px] text-gray-400">
                    <HorizontaLDots />
                  </h2>
                )}
                <div
                  className="grid transition-[grid-template-rows] duration-300 ease-in-out"
                  style={{ gridTemplateRows: isCollapsed ? "0fr" : "1fr" }}
                >
                  <div className="overflow-hidden">
                    {renderMenuItems(group)}
                  </div>
                </div>
              </div>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};

export default AppSidebar;
