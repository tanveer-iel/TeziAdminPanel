"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import Button from "../ui/button/Button";
import IconButton from "../ui/button/IconButton";
import { PencilIcon, TrashIcon } from "../ui/button/icons";
import supabase from "../../../SupabaseConfig";
import { toast } from "sonner";
import { Modal } from "../ui/modal";
import ConfirmDialog from "../ui/modal/ConfirmDialog";
import Label from "../form/Label";
import TextArea from "../form/input/TextArea";
import { TableSkeleton } from "../ui/skeleton/Skeleton";
import TableSearchBar from "../ui/table/TableSearchBar";
import { FINANCIAL_TABS } from "../../lib/financialStatementTabs";
import { removeOldPdf } from "../../lib/financialStatementFiles";
import {
  deriveFinancialYear,
  fyMonthPosition,
  resolveYearChoice,
  storedFileName,
} from "../../lib/financialYear";
import type { YearChoice } from "../../lib/financialYear";
import FinancialYearPicker from "../financials/FinancialYearPicker";
import { ensureFinancialYear } from "../../lib/financialYearDb";

const BUCKET = "PDF Files";
const UNASSIGNED = "Unassigned";

const inputClass =
  "h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-[13px] text-gray-700 shadow-theme-xs outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200";

const headerCell =
  "px-4 py-2.5 font-semibold text-gray-500 text-[11px] uppercase tracking-wide dark:text-gray-400";

interface FinancialYearRef {
  label: string;
  start_date: string;
}

interface Statement {
  id: number | string;
  short_des: string;
  tab: string;
  pdf: string;
  created_at?: string;
  financial_year_id: number | string | null;
  financial_years: FinancialYearRef | null;
}

interface Section {
  key: string;
  label: string;
  startDate: string; // "" for the Unassigned section
  rows: Statement[];
}

interface TableProps {
  /** Change this number to make the table reload. */
  refreshKey: number;
  /** Called after the table itself changes data (edit, assign) so the page can reload. */
  onChanged: () => void;
}

/** Groups statements by financial year: newest year first, Unassigned last. */
function groupByFinancialYear(rows: Statement[]): Section[] {
  const sections = new Map<string, Section>();

  for (const row of rows) {
    const fy = row.financial_years;
    const key = fy?.label ?? UNASSIGNED;
    let section = sections.get(key);
    if (!section) {
      section = { key, label: key, startDate: fy?.start_date ?? "", rows: [] };
      sections.set(key, section);
    }
    section.rows.push(row);
  }

  // Inside a financial year, list documents latest month first: June at the top,
  // July at the bottom. Documents that name no month go after July. Equal months keep
  // the order the rows arrived in (newest upload first). The Unassigned section is
  // left as it is.
  for (const section of sections.values()) {
    if (!section.startDate) continue;
    section.rows.sort(
      (a, b) =>
        (fyMonthPosition(b.short_des, b.tab) ?? 0) - (fyMonthPosition(a.short_des, a.tab) ?? 0)
    );
  }

  return [...sections.values()].sort((a, b) => {
    if (!a.startDate && !b.startDate) return 0;
    if (!a.startDate) return 1;
    if (!b.startDate) return -1;
    return b.startDate.localeCompare(a.startDate);
  });
}

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err && "message" in err) {
    return String((err as { message: unknown }).message);
  }
  return fallback;
}

export default function FinancialStatementTable({ refreshKey, onChanged }: TableProps) {
  const [statements, setStatements] = useState<Statement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  // Sections are open unless the user has closed them. While searching, all
  // matching sections are shown open.
  const [closedSections, setClosedSections] = useState<Record<string, boolean>>({});

  // Edit form
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selected, setSelected] = useState<Statement | null>(null);
  const [editDesc, setEditDesc] = useState("");
  const [editTab, setEditTab] = useState("");
  const [editChoice, setEditChoice] = useState<YearChoice>("auto");
  const [editPeriodEnd, setEditPeriodEnd] = useState("");
  const [editToday, setEditToday] = useState(() => new Date());
  const [editPdf, setEditPdf] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<Statement | null>(null);
  const [deleting, setDeleting] = useState(false);

  // One-time assignment of older statements
  const [assigning, setAssigning] = useState(false);

  // ---------------- FETCH ----------------
  useEffect(() => {
    let cancelled = false;

    async function fetchStatements() {
      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from("finanicial_statements")
          .select("*, financial_years(label, start_date)")
          .order("created_at", { ascending: false });

        if (fetchError) throw fetchError;
        if (cancelled) return;

        // The joined year comes back as an object, or a one-item array on some setups
        const rows: Statement[] = (data ?? []).map((row) => ({
          ...row,
          financial_years: Array.isArray(row.financial_years)
            ? row.financial_years[0] ?? null
            : row.financial_years ?? null,
        }));
        setStatements(rows);
      } catch (err) {
        console.error("Error fetching financial statements:", err);
        if (!cancelled) {
          setError(
            "Failed to load financial statements. If this is a new setup, check that the financial_years migration has been applied."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchStatements();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  // ---------------- SEARCH + GROUP ----------------
  const searching = search.trim().length > 0;

  const sections = useMemo(() => {
    const q = search.trim().toLowerCase();
    const visible = q
      ? statements.filter(
          (row) =>
            row.short_des.toLowerCase().includes(q) ||
            row.tab.toLowerCase().includes(q) ||
            (row.financial_years?.label ?? UNASSIGNED).toLowerCase().includes(q)
        )
      : statements;
    return groupByFinancialYear(visible);
  }, [statements, search]);

  const unassigned = useMemo(
    () => statements.filter((row) => !row.financial_year_id),
    [statements]
  );

  const toggleSection = (key: string) => {
    if (searching) return;
    setClosedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // ---------------- DELETE ----------------
  const handleDelete = async (row: Statement) => {
    const id = row.id;
    setDeleting(true);
    try {
      const { error: deleteError } = await supabase
        .from("finanicial_statements")
        .delete()
        .eq("id", id);
      if (deleteError) throw deleteError;

      setStatements((prev) => prev.filter((item) => item.id !== id));
      toast.success("Record deleted successfully");

      // The row is gone, so its PDF is no longer needed (kept if another row shares it).
      await removeOldPdf(row.pdf);
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Failed to delete record");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  // ---------------- EDIT ----------------
  const handleEdit = (row: Statement) => {
    setSelected(row);
    setEditDesc(row.short_des);
    setEditTab(row.tab);
    setEditChoice("auto");
    setEditPeriodEnd("");
    setEditToday(new Date());
    setEditPdf(null);
    setIsEditOpen(true);
  };

  const editResolution = resolveYearChoice(editChoice, editDesc, editTab, editPeriodEnd, editToday);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || saving) return;

    const title = editDesc.trim();
    if (!title || !editTab) {
      toast.error("Description and tab are required");
      return;
    }

    // Automatic re-reads the year from the (possibly edited) description. When
    // it has no year, the statement keeps its current year; a statement that
    // has none yet needs Current, Previous or Another year.
    const fy = editResolution.fy;
    if (!fy && !selected.financial_year_id) {
      toast.error(
        "Choose the financial year: add the year to the description (for example 30 June 2026), or pick Current, Previous or Another year."
      );
      return;
    }

    setSaving(true);
    let uploadedName: string | null = null;

    try {
      let pdfUrl = selected.pdf;

      // Replace the PDF only if a new one was chosen
      if (editPdf) {
        // Same naming as the add form: the file keeps its own name, plus a timestamp prefix.
        const fileName = `${Date.now()}-${editPdf.name}`;

        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(fileName, editPdf, { contentType: "application/pdf" });
        if (uploadError) throw uploadError;
        uploadedName = fileName;

        pdfUrl = supabase.storage.from(BUCKET).getPublicUrl(fileName).data.publicUrl;
      }

      const financialYearId = fy
        ? await ensureFinancialYear(fy)
        : selected.financial_year_id;

      const { error: updateError } = await supabase
        .from("finanicial_statements")
        .update({
          short_des: title,
          tab: editTab,
          pdf: pdfUrl,
          financial_year_id: financialYearId,
        })
        .eq("id", selected.id);
      if (updateError) throw updateError;

      // A new PDF replaced the old one: the old file is no longer used.
      if (editPdf && selected.pdf && selected.pdf !== pdfUrl) {
        await removeOldPdf(selected.pdf);
      }

      toast.success("Financial Statement updated successfully");
      setIsEditOpen(false);
      setSelected(null);
      onChanged();
    } catch (err) {
      console.error(err);
      if (uploadedName) {
        await supabase.storage.from(BUCKET).remove([uploadedName]);
      }
      toast.error("Failed to update Financial Statement: " + errorMessage(err, "unknown error"));
    } finally {
      setSaving(false);
    }
  };

  // ---------------- ASSIGN EXISTING STATEMENTS ----------------
  // Reads the year from each unassigned statement's description. Statements
  // whose description has no year are left for a manual edit.
  const handleAssign = async () => {
    setAssigning(true);

    const idByLabel = new Map<string, number | string>();
    let assigned = 0;
    let skipped = 0;
    let failed = 0;

    for (const row of unassigned) {
      const fy = deriveFinancialYear(row.short_des, row.tab);
      if (!fy) {
        skipped++;
        continue;
      }

      try {
        let id = idByLabel.get(fy.label);
        if (id === undefined) {
          id = await ensureFinancialYear(fy);
          idByLabel.set(fy.label, id);
        }

        const { error: updateError } = await supabase
          .from("finanicial_statements")
          .update({ financial_year_id: id })
          .eq("id", row.id);
        if (updateError) throw updateError;
        assigned++;
      } catch (err) {
        console.error("Assign error:", err);
        failed++;
      }
    }

    setAssigning(false);

    if (assigned > 0) toast.success(`Assigned ${assigned} statement(s) to their financial year`);
    if (skipped > 0) {
      toast.info(`${skipped} statement(s) have no year in the description. Edit them to add one.`);
    }
    if (failed > 0) toast.error(`${failed} statement(s) could not be updated`);

    onChanged();
  };

  // ---------------- UI STATES ----------------
  if (loading) {
    return (
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <TableSkeleton rows={7} cols={4} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-[13px] text-error-500 dark:border-white/[0.05] dark:bg-white/[0.03]">
        {error}
      </div>
    );
  }

  if (statements.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-[13px] text-gray-500 dark:border-white/[0.05] dark:bg-white/[0.03]">
        No Financial Statements found.
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
          <TableSearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search by title, type or year (e.g. 2026-27)…"
          />
        </div>

        {/* Older statements that have no financial year yet */}
        {unassigned.length > 0 && !searching && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warning-200 bg-warning-50 px-4 py-3 text-[12.5px] text-gray-700 dark:border-warning-500/30 dark:bg-warning-500/10 dark:text-gray-300">
            <span>
              {unassigned.length} statement(s) are not in a financial year yet.
              Assign them automatically from the year in their description.
            </span>
            <Button type="button" size="sm" onClick={handleAssign} disabled={assigning}>
              {assigning ? "Assigning…" : "Assign financial years"}
            </Button>
          </div>
        )}

        {sections.length === 0 && (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-[13px] text-gray-500 dark:border-white/[0.05] dark:bg-white/[0.03]">
            No records match your search.
          </div>
        )}

        {/* One section per financial year */}
        {sections.map((section) => {
          const isOpen = searching || !closedSections[section.key];

          return (
            <section
              key={section.key}
              className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]"
            >
              <button
                type="button"
                onClick={() => toggleSection(section.key)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 px-4 py-2.5 text-start dark:border-white/[0.05] dark:bg-white/[0.02]"
              >
                <span className="flex items-baseline gap-2">
                  <span className="text-[14px] font-semibold text-gray-800 dark:text-white/90">
                    {section.label}
                  </span>
                  <span className="text-[12px] text-gray-500 dark:text-gray-400">
                    {section.rows.length} document{section.rows.length === 1 ? "" : "s"}
                  </span>
                </span>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`text-gray-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {isOpen && (
                <Table>
                  <TableHeader className="border-b border-gray-200 dark:border-white/[0.05]">
                    <TableRow>
                      <TableCell isHeader className={`${headerCell} text-start`}>
                        Description
                      </TableCell>
                      <TableCell isHeader className={`${headerCell} text-start`}>
                        Tab Title
                      </TableCell>
                      <TableCell isHeader className={`${headerCell} text-start`}>
                        PDF
                      </TableCell>
                      <TableCell isHeader className={`${headerCell} text-end`}>
                        Action
                      </TableCell>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {section.rows.map((item) => (
                      <TableRow
                        key={item.id}
                        className="border-b border-gray-100 last:border-0 dark:border-white/[0.04] hover:bg-gray-50/60 dark:hover:bg-white/[0.02]"
                      >
                        <TableCell className="px-4 py-2.5 font-medium text-gray-800 text-start text-[13px] dark:text-white/90">
                          {item.short_des}
                        </TableCell>
                        <TableCell className="px-4 py-2.5 text-gray-500 text-start text-[12.5px] dark:text-gray-400">
                          {item.tab}
                        </TableCell>
                        <TableCell className="px-4 py-2.5 text-start">
                          <button
                            type="button"
                            onClick={() => window.open(item.pdf, "_blank")}
                            className="inline-flex items-center gap-1 text-[12.5px] font-medium text-brand-500 hover:text-brand-600 hover:underline dark:text-brand-400"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                              <polyline points="14 2 14 8 20 8" />
                            </svg>
                            View PDF
                          </button>
                          {/* The stored file name, so the year label can be checked at a glance */}
                          {(() => {
                            const fileName = storedFileName(item.pdf);
                            return (
                              <span
                                title={fileName}
                                className="mt-0.5 block max-w-[260px] truncate text-[11.5px] text-gray-500 dark:text-gray-400"
                              >
                                {fileName}
                              </span>
                            );
                          })()}
                        </TableCell>
                        <TableCell className="px-4 py-2.5 text-end">
                          <div className="inline-flex items-center gap-1">
                            <IconButton title="Edit" onClick={() => handleEdit(item)}>
                              <PencilIcon />
                            </IconButton>
                            <IconButton
                              title="Delete"
                              variant="danger"
                              onClick={() => setDeleteTarget(item)}
                            >
                              <TrashIcon />
                            </IconButton>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </section>
          );
        })}
      </div>

      {/* ---------------- EDIT MODAL ---------------- */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        className="max-w-[584px] p-5 lg:p-10"
      >
        <form onSubmit={handleUpdate} className="space-y-5">
          <h4 className="text-[15px] font-semibold text-gray-800 dark:text-white/90">
            Update Financial Statement
          </h4>

          <div>
            <Label>Description</Label>
            <TextArea value={editDesc} onChange={(value) => setEditDesc(value)} disabled={saving} />
          </div>

          <div>
            <Label>Tab Title</Label>
            <select
              value={editTab}
              onChange={(e) => setEditTab(e.target.value)}
              required
              disabled={saving}
              className={inputClass}
            >
              <option value="" disabled>
                Select financial statement type
              </option>
              {FINANCIAL_TABS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Financial year: automatic, current, previous, or another year */}
          <FinancialYearPicker
            choice={editChoice}
            onChoiceChange={setEditChoice}
            periodEnd={editPeriodEnd}
            onPeriodEndChange={setEditPeriodEnd}
            resolution={editResolution}
            today={editToday}
            disabled={saving}
            keepLabel={selected?.financial_years?.label ?? null}
          />

          <div>
            <Label>Replace PDF (optional)</Label>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => setEditPdf(e.target.files?.[0] || null)}
              disabled={saving}
              className="w-full text-[13px] text-gray-600 dark:text-gray-400"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => setIsEditOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? "Saving…" : "Update"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ---------------- DELETE CONFIRM ---------------- */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete record?"
        description={deleteTarget ? `This will permanently remove "${deleteTarget.short_des}" and its PDF file.` : undefined}
        loading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
      />
    </>
  );
}
