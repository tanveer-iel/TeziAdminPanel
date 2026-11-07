/**
 * Financial-year helpers. The financial year runs July to June and is named
 * after the calendar year it starts in:
 *
 *   1 Jul 2026 - 30 Jun 2027  ->  "FY 2026-27"
 *
 * Pure functions only (no React, no Supabase), so they are easy to unit test.
 * The database side lives in ./financialYearDb.ts.
 */

export interface FinancialYear {
  label: string; // "FY 2026-27"
  startDate: string; // "2026-07-01"
  endDate: string; // "2027-06-30"
}

const MONTH_NAMES =
  "january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sept|sep|oct|nov|dec";

// "30 June 2026", "June 30, 2026", "Sept 2026". The year is optional so the
// same pattern also finds a bare month name.
const MONTH_YEAR_RE = new RegExp(
  `\\b(?:\\d{1,2}(?:st|nd|rd|th)?\\s+)?(${MONTH_NAMES})\\b\\.?,?\\s*(?:\\d{1,2}(?:st|nd|rd|th)?,?\\s*)?(20\\d{2})?`
);
const MONTH_ONLY_RE = new RegExp(`\\b(${MONTH_NAMES})\\b`);

const SHORT_MONTHS = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
];

/** "september" / "sept" / "sep" -> 9. Returns 0 if the word is not a month. */
function monthNumber(word: string): number {
  return SHORT_MONTHS.indexOf(word.slice(0, 3)) + 1;
}

/** The financial year that starts on 1 July of `startYear`. */
export function fyFromStartYear(startYear: number): FinancialYear {
  const endYear = startYear + 1;
  return {
    label: `FY ${startYear}-${String(endYear % 100).padStart(2, "0")}`,
    startDate: `${startYear}-07-01`,
    endDate: `${endYear}-06-30`,
  };
}

/** The financial year containing a given month (1-12) of a calendar year. */
export function fyForDate(year: number, month: number): FinancialYear {
  return fyFromStartYear(month >= 7 ? year : year - 1);
}

/** The financial year for a "YYYY-MM-DD" date string (an <input type="date"> value). */
export function fyForIsoDate(iso: string): FinancialYear | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (year < 2000 || year > 2099 || month < 1 || month > 12) return null;
  return fyForDate(year, month);
}

/**
 * Works out the financial year from a document title (and, optionally, the
 * statement tab such as "Quarter Ended 30 Sept"). Tries, in order:
 *
 *   1. An explicit range: "2026-27" or "2026-2027".
 *   2. A month name with a year: "30 June 2026", "Sept 2026".
 *   3. Any four-digit year in the title plus a month from the tab or title.
 *
 * A lone year is taken to be the calendar year in which the period ends.
 * Returns null when the title does not say which year it is.
 */
export function deriveFinancialYear(title: string, tab = ""): FinancialYear | null {
  const text = title.toLowerCase();

  // 1. Explicit range
  const range = /\b(20\d{2})\s*[-\u2013/]\s*(\d{4}|\d{2})\b/.exec(text);
  if (range) {
    const startYear = Number(range[1]);
    if (Number(range[2]) % 100 === (startYear + 1) % 100) {
      return fyFromStartYear(startYear);
    }
  }

  // 2. Month name and year
  const monthYear = MONTH_YEAR_RE.exec(text);
  if (monthYear?.[2]) {
    return fyForDate(Number(monthYear[2]), monthNumber(monthYear[1]));
  }

  // 3. A year in the title, plus the month from the tab (or the title)
  const year = /\b(20\d{2})\b/.exec(text)?.[1];
  const month = MONTH_ONLY_RE.exec(tab.toLowerCase())?.[1] ?? monthYear?.[1];
  if (year && month) {
    return fyForDate(Number(year), monthNumber(month));
  }

  return null;
}

/**
 * Where a document's month falls inside its financial year: July = 1 ... June = 12.
 * Used to list documents in order within a year. The month is read from the title
 * first ("LCB for July, 2026", "30 June 2026"), then from the statement tab
 * ("Quarter Ended 30 Sept"). Returns null when neither names a month.
 */
export function fyMonthPosition(title: string, tab = ""): number | null {
  const fromTitle = MONTH_ONLY_RE.exec(title.toLowerCase())?.[1];
  const fromTab = MONTH_ONLY_RE.exec(tab.toLowerCase())?.[1];
  const word = fromTitle ?? fromTab;
  if (!word) return null;
  const month = monthNumber(word);
  return month ? ((month - 7 + 12) % 12) + 1 : null;
}

/**
 * How many months into a new financial year the "Previous" option is offered.
 * 3 = July to September only; 12 (the default) = all year round.
 * Whatever this is set to, "Another year" (pick a date) is always available.
 */
export const PREVIOUS_FY_WINDOW_MONTHS = 12;

/** The financial year that contains `today`. */
export function currentFinancialYear(today: Date = new Date()): FinancialYear {
  return fyForDate(today.getFullYear(), today.getMonth() + 1);
}

/** The financial year before the one that contains `today`. */
export function previousFinancialYear(today: Date = new Date()): FinancialYear {
  return fyFromStartYear(Number(currentFinancialYear(today).startDate.slice(0, 4)) - 1);
}

/** True while "Previous" should be offered: within the window after 1 July. */
export function isPreviousYearOffered(
  today: Date = new Date(),
  windowMonths: number = PREVIOUS_FY_WINDOW_MONTHS
): boolean {
  const monthsIntoYear = (today.getMonth() + 1 - 7 + 12) % 12; // July = 0 ... June = 11
  return monthsIntoYear < windowMonths;
}

/** What the person picked in the "Financial year" selector. */
export type YearChoice = "auto" | "current" | "previous" | "other";

export interface YearResolution {
  /** The year the statement will be saved under, or null if still undecided. */
  fy: FinancialYear | null;
  /** Where `fy` came from. */
  source: "description" | "current" | "previous" | "date" | "none";
  /** The year the description points to, when it differs from an explicit choice. */
  conflict: FinancialYear | null;
}

/**
 * Decides the financial year for a statement:
 *
 *   auto      the year read from the description (null if it has none)
 *   current   the financial year containing today
 *   previous  the year before that, for late documents after a new year starts
 *   other     the year containing the period end date the person picked
 *
 * An explicit choice always wins over the description. When the two disagree,
 * `conflict` holds the year the description points to so the form can warn.
 */
export function resolveYearChoice(
  choice: YearChoice,
  title: string,
  tab: string,
  periodEnd: string,
  today: Date = new Date()
): YearResolution {
  const fromDescription = deriveFinancialYear(title, tab);

  if (choice === "auto") {
    return fromDescription
      ? { fy: fromDescription, source: "description", conflict: null }
      : { fy: null, source: "none", conflict: null };
  }

  let chosen: FinancialYear | null;
  let source: YearResolution["source"];
  if (choice === "current") {
    chosen = currentFinancialYear(today);
    source = "current";
  } else if (choice === "previous") {
    chosen = previousFinancialYear(today);
    source = "previous";
  } else {
    chosen = fyForIsoDate(periodEnd);
    source = chosen ? "date" : "none";
  }

  const conflict =
    chosen && fromDescription && fromDescription.label !== chosen.label ? fromDescription : null;
  return { fy: chosen, source, conflict };
}

/**
 * The readable file name behind a stored PDF URL, without the upload
 * timestamp: ".../1762500000000-LCB THIMS JULY 2026.pdf"
 * becomes "LCB THIMS JULY 2026.pdf".
 */
export function storedFileName(url: string): string {
  const last = (url.split("?")[0].split("/").pop() ?? "").trim();
  let name = last;
  try {
    name = decodeURIComponent(last);
  } catch {
    // keep the raw segment if it is not valid percent-encoding
  }
  return name.replace(/^\d{10,}-/, "");
}
