// Run with:  node --test scripts/test-financial-year.mjs
// (Node 22.18+ runs the .ts import directly; on 22.6-22.17 add --experimental-strip-types.)
import test from "node:test";
import assert from "node:assert/strict";
import {
  PREVIOUS_FY_WINDOW_MONTHS,
  currentFinancialYear,
  deriveFinancialYear,
  fyForDate,
  fyForIsoDate,
  fyFromStartYear,
  fyMonthPosition,
  isPreviousYearOffered,
  previousFinancialYear,
  resolveYearChoice,
  storedFileName,
} from "../src/lib/financialYear.ts";

test("July to December starts the year, January to June ends it", () => {
  assert.equal(fyForDate(2026, 7).label, "FY 2026-27");
  assert.equal(fyForDate(2026, 12).label, "FY 2026-27");
  assert.equal(fyForDate(2027, 1).label, "FY 2026-27");
  assert.equal(fyForDate(2027, 6).label, "FY 2026-27");
  assert.equal(fyForDate(2027, 7).label, "FY 2027-28");
});

test("label and date range", () => {
  assert.deepEqual(fyFromStartYear(2026), {
    label: "FY 2026-27",
    startDate: "2026-07-01",
    endDate: "2027-06-30",
  });
  assert.equal(fyFromStartYear(2099).label, "FY 2099-00");
});

test("period end dates from the date picker", () => {
  assert.equal(fyForIsoDate("2026-06-30")?.label, "FY 2025-26");
  assert.equal(fyForIsoDate("2026-07-01")?.label, "FY 2026-27");
  assert.equal(fyForIsoDate("2027-03-31")?.label, "FY 2026-27");
  assert.equal(fyForIsoDate(""), null);
  assert.equal(fyForIsoDate("31/03/2027"), null);
  assert.equal(fyForIsoDate("2026-13-01"), null);
});

const titleCases = [
  // [title, tab, expected label or null]
  ["Annual Report 30 June 2026", "Audited Finantials 30 June", "FY 2025-26"],
  ["Annual Report 2026", "Audited Finantials 30 June", "FY 2025-26"],
  ["Quarter ended 30 Sept 2026", "Quarter Ended 30 Sept", "FY 2026-27"],
  ["Accounts 2026", "Quarter Ended 30 Sept", "FY 2026-27"],
  ["Half Year Dec 2026", "Half Yearly 31 Dec", "FY 2026-27"],
  ["Quarter ended 31 March 2027", "Quarter Ended 31 March", "FY 2026-27"],
  ["June 30, 2027", "LCB", "FY 2026-27"],
  ["Results 1st July 2027", "", "FY 2027-28"],
  ["Accounts 2026-27", "LCB", "FY 2026-27"],
  ["Accounts 2026-2027", "", "FY 2026-27"],
  ["Accounts 2026/27", "", "FY 2026-27"],
  ["Quarterly accounts", "Quarter Ended 30 Sept", null],
  ["Market review 2026", "LCB", null],
  ["Accounts 2026-28", "LCB", null],
  ["FY26 results", "Quarter Ended 30 Sept", null],
];

for (const [title, tab, expected] of titleCases) {
  test(`derive: "${title}" [${tab || "no tab"}] -> ${expected ?? "not found"}`, () => {
    assert.equal(deriveFinancialYear(title, tab)?.label ?? null, expected);
  });
}

// ---- Current / Previous / Another year ------------------------------------
const day = (y, m, d) => new Date(y, m - 1, d); // local date, month 1-12

test("current and previous year follow today's date", () => {
  assert.equal(currentFinancialYear(day(2026, 11, 7)).label, "FY 2026-27");
  assert.equal(previousFinancialYear(day(2026, 11, 7)).label, "FY 2025-26");
  assert.equal(currentFinancialYear(day(2026, 7, 1)).label, "FY 2026-27");
  assert.equal(previousFinancialYear(day(2026, 7, 1)).label, "FY 2025-26");
  assert.equal(currentFinancialYear(day(2027, 6, 30)).label, "FY 2026-27");
  assert.equal(currentFinancialYear(day(2027, 7, 1)).label, "FY 2027-28");
  assert.equal(previousFinancialYear(day(2027, 7, 1)).label, "FY 2026-27");
  assert.equal(currentFinancialYear(day(2026, 6, 30)).label, "FY 2025-26");
  assert.equal(previousFinancialYear(day(2026, 6, 30)).label, "FY 2024-25");
});

test("the Previous option window: first 3 months, or all year", () => {
  for (const [m, expected] of [[7, true], [8, true], [9, true], [10, false], [12, false], [1, false], [6, false]]) {
    assert.equal(isPreviousYearOffered(day(2026, m, 15), 3), expected, `month ${m}, window 3`);
  }
  assert.equal(isPreviousYearOffered(day(2026, 6, 30), 3), false);
  assert.equal(isPreviousYearOffered(day(2026, 7, 1), 3), true);
  assert.equal(isPreviousYearOffered(day(2026, 9, 30), 3), true);
  assert.equal(isPreviousYearOffered(day(2026, 10, 1), 3), false);
  // The shipped default offers it all year round
  assert.equal(PREVIOUS_FY_WINDOW_MONTHS, 12);
  for (let m = 1; m <= 12; m++) assert.equal(isPreviousYearOffered(day(2026, m, 15)), true);
});

const TODAY = day(2026, 8, 12); // a new year (FY 2026-27) has just started

test("Automatic reads the description, and has nothing without a year", () => {
  const r = resolveYearChoice("auto", "Annual Report 30 June 2026", "Audited Finantials 30 June", "", TODAY);
  assert.equal(r.fy?.label, "FY 2025-26");
  assert.equal(r.source, "description");
  const none = resolveYearChoice("auto", "Quarterly accounts", "LCB", "", TODAY);
  assert.equal(none.fy, null);
  assert.equal(none.source, "none");
});

test("Previous files a late document under the year that just ended", () => {
  const r = resolveYearChoice("previous", "Quarterly accounts", "LCB", "", TODAY);
  assert.equal(r.fy?.label, "FY 2025-26");
  assert.equal(r.source, "previous");
  assert.equal(r.conflict, null);
});

test("Current files a document under the year that contains today", () => {
  const r = resolveYearChoice("current", "Quarterly accounts", "LCB", "", TODAY);
  assert.equal(r.fy?.label, "FY 2026-27");
  assert.equal(r.source, "current");
});

test("an explicit choice beats the description, and the conflict is reported", () => {
  const r = resolveYearChoice("current", "Annual Report 30 June 2026", "Audited Finantials 30 June", "", TODAY);
  assert.equal(r.fy?.label, "FY 2026-27");
  assert.equal(r.conflict?.label, "FY 2025-26");
  // No conflict when the choice and the description agree
  const same = resolveYearChoice("previous", "Annual Report 30 June 2026", "Audited Finantials 30 June", "", TODAY);
  assert.equal(same.fy?.label, "FY 2025-26");
  assert.equal(same.conflict, null);
});

test("Another year uses the period end date", () => {
  const r = resolveYearChoice("other", "Quarterly accounts", "LCB", "2025-03-31", TODAY);
  assert.equal(r.fy?.label, "FY 2024-25");
  assert.equal(r.source, "date");
  assert.equal(resolveYearChoice("other", "Quarterly accounts", "LCB", "", TODAY).fy, null);
  assert.equal(resolveYearChoice("other", "Quarterly accounts", "LCB", "", TODAY).source, "none");
});

test("the stored file name is shown without the upload timestamp", () => {
  const base = "https://x.supabase.co/storage/v1/object/public/PDF%20Files/";
  assert.equal(storedFileName(base + "1762500000000-LCB THIMS JULY 2026.pdf"), "LCB THIMS JULY 2026.pdf");
  assert.equal(storedFileName(base + "1762500000000-LCB%20THIMS.pdf?download=1"), "LCB THIMS.pdf");
  assert.equal(storedFileName(base + "old-report.pdf"), "old-report.pdf");
  assert.equal(storedFileName(""), "");
});

test("month position inside the financial year: July = 1 ... June = 12", () => {
  assert.equal(fyMonthPosition("LCB for July, 2026", "LCB"), 1);
  assert.equal(fyMonthPosition("LCB August 2026", "LCB"), 2);
  assert.equal(fyMonthPosition("Accounts 30 Sept 2026", ""), 3);
  assert.equal(fyMonthPosition("LCB December 2026", "LCB"), 6);
  assert.equal(fyMonthPosition("LCB January 2027", "LCB"), 7);
  assert.equal(fyMonthPosition("LCB June 2027", "LCB"), 12);
  // The tab supplies the month when the title has none
  assert.equal(fyMonthPosition("Accounts 2026", "Quarter Ended 30 Sept"), 3);
  assert.equal(fyMonthPosition("Annual report", "Audited Finantials 30 June"), 12);
  assert.equal(fyMonthPosition("Interim accounts", "Half Yearly 31 Dec"), 6);
  // No month anywhere
  assert.equal(fyMonthPosition("Quarterly accounts", "LCB"), null);
  assert.equal(fyMonthPosition("", ""), null);
});

test("documents sort latest month first (June at the top, July at the bottom), no-month last", () => {
  const rows = ["LCB for July, 2026", "Misc notes", "LCB June 2027", "LCB October 2026", "LCB January 2027"];
  const sorted = [...rows].sort((a, b) => (fyMonthPosition(b, "LCB") ?? 0) - (fyMonthPosition(a, "LCB") ?? 0));
  assert.deepEqual(sorted, ["LCB June 2027", "LCB January 2027", "LCB October 2026", "LCB for July, 2026", "Misc notes"]);
});
