"use client";

import React from "react";
import Label from "../form/Label";
import {
  currentFinancialYear,
  isPreviousYearOffered,
  previousFinancialYear,
} from "../../lib/financialYear";
import type { YearChoice, YearResolution } from "../../lib/financialYear";

interface FinancialYearPickerProps {
  choice: YearChoice;
  onChoiceChange: (choice: YearChoice) => void;
  /** "YYYY-MM-DD", used only when the choice is "other". */
  periodEnd: string;
  onPeriodEndChange: (value: string) => void;
  /** The outcome of resolveYearChoice() for the current form values. */
  resolution: YearResolution;
  /** The date the form was opened; decides what "Current" and "Previous" mean. */
  today: Date;
  disabled?: boolean;
  /** Edit form only: the statement's present year, kept when the description has none. */
  keepLabel?: string | null;
}

const fieldClass =
  "h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-[13px] text-gray-700 shadow-theme-xs outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:disabled:bg-gray-800 dark:disabled:text-gray-500";

const SOURCE_TEXT: Record<YearResolution["source"], string> = {
  description: "read from the description",
  current: "current financial year",
  previous: "previous financial year",
  date: "from the period end date",
  none: "",
};

/**
 * "Financial year" selector shared by the add and edit forms.
 *
 * Automatic reads the year from the description. Current and Previous let
 * someone file a late document for the year that just ended once a new year
 * has started. Another year covers anything older, using a period end date.
 */
export default function FinancialYearPicker({
  choice,
  onChoiceChange,
  periodEnd,
  onPeriodEndChange,
  resolution,
  today,
  disabled = false,
  keepLabel = null,
}: FinancialYearPickerProps) {
  const current = currentFinancialYear(today);
  const previous = previousFinancialYear(today);
  // Keep "Previous" in the list if it is already selected
  const offerPrevious = isPreviousYearOffered(today) || choice === "previous";
  const { fy, source, conflict } = resolution;

  return (
    <div className="space-y-3 rounded-md border border-gray-200 bg-gray-50 p-3 dark:border-white/[0.05] dark:bg-white/[0.02]">
      <div>
        <Label>Financial year (July to June)</Label>
        <select
          value={choice}
          onChange={(e) => onChoiceChange(e.target.value as YearChoice)}
          disabled={disabled}
          className={fieldClass}
        >
          <option value="auto">Automatic (read from the description)</option>
          <option value="current">Current: {current.label}</option>
          {offerPrevious && <option value="previous">Previous: {previous.label}</option>}
          <option value="other">Another year (pick a date)</option>
        </select>
      </div>

      {choice === "other" && (
        <div>
          <Label>Period end date</Label>
          <input
            type="date"
            value={periodEnd}
            onChange={(e) => onPeriodEndChange(e.target.value)}
            disabled={disabled}
            className={fieldClass}
          />
        </div>
      )}

      {fy ? (
        <p className="text-[12.5px] text-gray-700 dark:text-gray-300">
          Will be saved under{" "}
          <span className="font-semibold text-brand-600 dark:text-brand-400">{fy.label}</span>
          {SOURCE_TEXT[source] ? ` (${SOURCE_TEXT[source]})` : ""}
        </p>
      ) : choice === "auto" && keepLabel ? (
        <p className="text-[12.5px] text-gray-600 dark:text-gray-400">
          The description has no year, so this statement stays in{" "}
          <span className="font-semibold">{keepLabel}</span>. Choose another option to move it.
        </p>
      ) : choice === "other" ? (
        <p className="text-[12.5px] text-gray-600 dark:text-gray-400">
          Pick the date the statement&apos;s period ends.
        </p>
      ) : (
        <p className="text-[12.5px] text-gray-600 dark:text-gray-400">
          No year found in the description. Add one (for example &quot;30 June 2026&quot;) or
          choose Current, Previous or Another year above.
        </p>
      )}

      {conflict && fy && (
        <p className="rounded-md border border-warning-200 bg-warning-50 px-3 py-2 text-[12.5px] text-gray-700 dark:border-warning-500/30 dark:bg-warning-500/10 dark:text-gray-300">
          The description reads as <span className="font-semibold">{conflict.label}</span>, but you
          chose <span className="font-semibold">{fy.label}</span>. Your choice will be used.
        </p>
      )}
    </div>
  );
}
