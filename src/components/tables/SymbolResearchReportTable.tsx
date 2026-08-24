"use client";

import React, { useEffect, useState } from "react";
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
import { TableSkeleton } from "../ui/skeleton/Skeleton";
import Badge from "../ui/badge/Badge";

interface SymbolResearch {
  id: number;
  symbol: string;
  case_points: string[] | null;
  key_risk: string | null;

  current_rating: string | null;
  current_rating_date: string | null;
  current_rating_price: number | null;

  previous_rating: string | null;
  previous_rating_period: string | null;
  previous_rating_price: number | null;

  document_title: string | null;
  document_url: string | null;

  created_at: string;
  updated_at: string;
}

interface ModalProps {
  value: boolean;
  setValue: (value: boolean) => void;
}

const ratingBadgeColor = (rating: string | null) => {
  if (rating === "BUY") return "success";
  if (rating === "SELL") return "error";
  if (rating === "HOLD") return "warning";
  return "light";
};

export default function SymbolReseaerchReportTable({
  value,
  setValue,
}: ModalProps) {
  const [researchData, setResearchData] = useState<SymbolResearch[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedResearch, setSelectedResearch] =
    useState<SymbolResearch | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<SymbolResearch | null>(null);
  const [deleting, setDeleting] = useState(false);

  /* ================= EDIT STATES ================= */

  const [editSymbol, setEditSymbol] = useState("");
  const [editCasePoints, setEditCasePoints] = useState("");
  const [editKeyRisk, setEditKeyRisk] = useState("");

  const [editCurrentRating, setEditCurrentRating] = useState("");
  const [editCurrentRatingDate, setEditCurrentRatingDate] = useState("");
  const [editCurrentRatingPrice, setEditCurrentRatingPrice] = useState("");

  const [editPreviousRating, setEditPreviousRating] = useState("");
  const [editPreviousRatingPeriod, setEditPreviousRatingPeriod] =
    useState("");
  const [editPreviousRatingPrice, setEditPreviousRatingPrice] = useState("");

  const [editDocumentTitle, setEditDocumentTitle] = useState("");
  const [editPdf, setEditPdf] = useState<File | null>(null);

  const [updateLoading, setUpdateLoading] = useState(false);

  /* ================= FETCH DATA ================= */

  useEffect(() => {
    fetchResearch();
  }, [value]);

  const fetchResearch = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("symbol_research")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setResearchData(data || []);
    } catch (err) {
      console.error(err);
      setError("Failed to load research data.");
    } finally {
      setLoading(false);
    }
  };

  /* ================= DELETE ================= */

  const handleDelete = async (id: number) => {
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("symbol_research")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setResearchData((prev) =>
        prev.filter((item) => item.id !== id)
      );

      toast.success("Research report deleted successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete research report");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  /* ================= EDIT ================= */

  const handleEdit = (item: SymbolResearch) => {
    setSelectedResearch(item);

    setEditSymbol(item.symbol || "");

    setEditCasePoints(
      item.case_points?.join("\n") || ""
    );

    setEditKeyRisk(item.key_risk || "");

    setEditCurrentRating(item.current_rating || "");
    setEditCurrentRatingDate(item.current_rating_date || "");
    setEditCurrentRatingPrice(
      item.current_rating_price?.toString() || ""
    );

    setEditPreviousRating(item.previous_rating || "");
    setEditPreviousRatingPeriod(
      item.previous_rating_period || ""
    );
    setEditPreviousRatingPrice(
      item.previous_rating_price?.toString() || ""
    );

    setEditDocumentTitle(item.document_title || "");

    setEditPdf(null);

    setIsEditOpen(true);
  };

  /* ================= UPDATE ================= */

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedResearch) return;

    try {
      setUpdateLoading(true);

      let documentUrl = selectedResearch.document_url;

      /* ================= UPLOAD NEW PDF ================= */

      if (editPdf) {
        const fileName = `${Date.now()}-${editPdf.name}`;

        const { error: uploadError } = await supabase.storage
          .from("PDF Files")
          .upload(fileName, editPdf);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from("PDF Files")
          .getPublicUrl(fileName);

        documentUrl = publicUrlData.publicUrl;
      }

      /* ================= CASE POINTS ================= */

      const casePoints = editCasePoints
        .split("\n")
        .map((point) => point.trim())
        .filter(Boolean);

      /* ================= UPDATE DATABASE ================= */

      const { data, error } = await supabase
        .from("symbol_research")
        .update({
          symbol: editSymbol.trim().toUpperCase(),

          case_points:
            casePoints.length > 0 ? casePoints : null,

          key_risk: editKeyRisk.trim() || null,

          current_rating:
            editCurrentRating.trim() || null,

          current_rating_date:
            editCurrentRatingDate.trim() || null,

          current_rating_price:
            editCurrentRatingPrice
              ? Number(editCurrentRatingPrice)
              : null,

          previous_rating:
            editPreviousRating.trim() || null,

          previous_rating_period:
            editPreviousRatingPeriod.trim() || null,

          previous_rating_price:
            editPreviousRatingPrice
              ? Number(editPreviousRatingPrice)
              : null,

          document_title:
            editDocumentTitle.trim() || null,

          document_url: documentUrl,

          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedResearch.id)
        .select()
        .single();

      if (error) throw error;

      /* ================= UPDATE LOCAL TABLE ================= */

      setResearchData((prev) =>
        prev.map((item) =>
          item.id === selectedResearch.id ? data : item
        )
      );

      toast.success("Research report updated successfully");

      setIsEditOpen(false);
      setSelectedResearch(null);
      setEditPdf(null);

      setValue(!value);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update research report");
    } finally {
      setUpdateLoading(false);
    }
  };

  /* ================= LOADING ================= */

  if (loading) {
    return (
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <TableSkeleton rows={7} cols={8} />
      </div>
    );
  }

  /* ================= ERROR ================= */

  if (error) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-[13px] text-error-500 dark:border-white/[0.05] dark:bg-white/[0.03]">
        {error}
      </div>
    );
  }

  /* ================= EMPTY ================= */

  if (researchData.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-[13px] text-gray-500 dark:border-white/[0.05] dark:bg-white/[0.03]">
        No Research Reports found.
      </div>
    );
  }

  /* ================= TABLE ================= */

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <Table>
          <TableHeader className="border-b border-gray-200 bg-gray-50 dark:border-white/[0.05] dark:bg-white/[0.02]">
            <TableRow>
              <TableCell isHeader className="px-4 py-2.5 font-semibold text-gray-500 text-start text-[11px] uppercase tracking-wide dark:text-gray-400">
                Symbol
              </TableCell>

              <TableCell isHeader className="px-4 py-2.5 font-semibold text-gray-500 text-start text-[11px] uppercase tracking-wide dark:text-gray-400">
                Case
              </TableCell>

              <TableCell isHeader className="px-4 py-2.5 font-semibold text-gray-500 text-start text-[11px] uppercase tracking-wide dark:text-gray-400">
                Key Risk
              </TableCell>

              <TableCell isHeader className="px-4 py-2.5 font-semibold text-gray-500 text-start text-[11px] uppercase tracking-wide dark:text-gray-400">
                Current Rating
              </TableCell>

              <TableCell isHeader className="px-4 py-2.5 font-semibold text-gray-500 text-start text-[11px] uppercase tracking-wide dark:text-gray-400">
                Current Price
              </TableCell>

              <TableCell isHeader className="px-4 py-2.5 font-semibold text-gray-500 text-start text-[11px] uppercase tracking-wide dark:text-gray-400">
                Previous Rating
              </TableCell>

              <TableCell isHeader className="px-4 py-2.5 font-semibold text-gray-500 text-start text-[11px] uppercase tracking-wide dark:text-gray-400">
                Document
              </TableCell>

              <TableCell isHeader className="px-4 py-2.5 font-semibold text-gray-500 text-end text-[11px] uppercase tracking-wide dark:text-gray-400">
                Action
              </TableCell>
            </TableRow>
          </TableHeader>

          <TableBody>
            {researchData.map((item) => (
              <TableRow key={item.id} className="border-b border-gray-100 last:border-0 dark:border-white/[0.04] hover:bg-gray-50/60 dark:hover:bg-white/[0.02]">
                {/* SYMBOL */}
                <TableCell className="px-4 py-2.5 font-medium text-gray-800 text-start text-[13px] dark:text-white/90">
                  {item.symbol}
                </TableCell>

                {/* CASE */}
                <TableCell className="px-4 py-2.5 text-gray-500 text-start text-[12.5px] dark:text-gray-400">
                  <div className="max-w-[220px]">
                    {item.case_points?.length ? (
                      <ul className="list-disc space-y-0.5 pl-4">
                        {item.case_points.map((point, index) => (
                          <li key={index}>{point}</li>
                        ))}
                      </ul>
                    ) : (
                      "—"
                    )}
                  </div>
                </TableCell>

                {/* KEY RISK */}
                <TableCell className="px-4 py-2.5 text-gray-500 text-start text-[12.5px] dark:text-gray-400">
                  <div className="max-w-[200px]">{item.key_risk || "—"}</div>
                </TableCell>

                {/* CURRENT RATING */}
                <TableCell className="px-4 py-2.5 text-start text-[12.5px]">
                  {item.current_rating ? (
                    <Badge size="sm" color={ratingBadgeColor(item.current_rating)}>
                      {item.current_rating}
                    </Badge>
                  ) : (
                    <span className="text-gray-500 dark:text-gray-400">—</span>
                  )}

                  {item.current_rating_date && (
                    <div className="mt-1 text-[12px] text-gray-400">
                      {item.current_rating_date}
                    </div>
                  )}
                </TableCell>

                {/* CURRENT PRICE */}
                <TableCell className="px-4 py-2.5 text-gray-500 text-start text-[12.5px] dark:text-gray-400">
                  {item.current_rating_price != null
                    ? `PKR ${item.current_rating_price}`
                    : "—"}
                </TableCell>

                {/* PREVIOUS */}
                <TableCell className="px-4 py-2.5 text-start text-[12.5px]">
                  {item.previous_rating ? (
                    <Badge size="sm" color={ratingBadgeColor(item.previous_rating)}>
                      {item.previous_rating}
                    </Badge>
                  ) : (
                    <span className="text-gray-500 dark:text-gray-400">—</span>
                  )}

                  {item.previous_rating_period && (
                    <div className="mt-1 text-[12px] text-gray-400">
                      {item.previous_rating_period}
                    </div>
                  )}

                  {item.previous_rating_price != null && (
                    <div className="mt-1 text-[12px] text-gray-400">
                      PKR {item.previous_rating_price}
                    </div>
                  )}
                </TableCell>

                {/* DOCUMENT */}
                <TableCell className="px-4 py-2.5 text-start text-[12.5px]">
                  {item.document_url ? (
                    <Button
                      size="sm"
                      onClick={() =>
                        window.open(item.document_url!, "_blank")
                      }
                    >
                      Open PDF
                    </Button>
                  ) : (
                    <span className="text-gray-500 dark:text-gray-400">No PDF</span>
                  )}

                  {item.document_title && (
                    <div className="mt-1 max-w-[160px] truncate text-[12px] text-gray-400">
                      {item.document_title}
                    </div>
                  )}
                </TableCell>

                {/* ACTION */}
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
      </div>

      {/* ================= EDIT MODAL ================= */}

      <Modal
        isOpen={isEditOpen}
        onClose={() => !updateLoading && setIsEditOpen(false)}
        className="max-w-[700px] p-5 lg:p-8 mt-[500px]"
      >
        <form
          onSubmit={handleUpdate}
          className="space-y-5"
        >

          <h4 className="text-[15px] font-semibold text-gray-800 dark:text-white/90">
            Update Symbol Research
          </h4>

          {/* SYMBOL */}

          <div>
            <Label>
              Symbol <span className="text-error-500">*</span>
            </Label>

            <input
              type="text"
              value={editSymbol}
              onChange={(e) =>
                setEditSymbol(e.target.value)
              }
              required
              disabled={updateLoading}
              className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-[13px] text-gray-700 shadow-theme-xs outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
            />
          </div>

          {/* CASE POINTS */}

          <div>
            <Label>
              The Case
            </Label>

            <textarea
              value={editCasePoints}
              onChange={(e) =>
                setEditCasePoints(e.target.value)
              }
              disabled={updateLoading}
              rows={6}
              placeholder={`Enter one point per line

Strong revenue growth
Improving margins
Positive industry outlook`}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-[13px] text-gray-700 shadow-theme-xs outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
            />

            <p className="mt-1 text-[12px] text-gray-400">
              Enter each point on a new line.
            </p>
          </div>

          {/* KEY RISK */}

          <div>
            <Label>
              Key Risk
            </Label>

            <textarea
              value={editKeyRisk}
              onChange={(e) =>
                setEditKeyRisk(e.target.value)
              }
              disabled={updateLoading}
              rows={3}
              placeholder="Enter key risk"
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-[13px] text-gray-700 shadow-theme-xs outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
            />
          </div>

          {/* CURRENT RATING */}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

            <div>
              <Label>
                Current Rating
              </Label>

              <select
                value={editCurrentRating}
                onChange={(e) =>
                  setEditCurrentRating(e.target.value)
                }
                disabled={updateLoading}
                className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-[13px] text-gray-700 shadow-theme-xs outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
              >
                <option value="">
                  Select Rating
                </option>
                <option value="BUY">
                  BUY
                </option>
                <option value="HOLD">
                  HOLD
                </option>
                <option value="SELL">
                  SELL
                </option>
              </select>
            </div>

            <div>
              <Label>
                Rating Date
              </Label>

              <input
                type="text"
                value={editCurrentRatingDate}
                onChange={(e) =>
                  setEditCurrentRatingDate(e.target.value)
                }
                placeholder="e.g. 21 Aug 2026"
                disabled={updateLoading}
                className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-[13px] text-gray-700 shadow-theme-xs outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
              />
            </div>

            <div>
              <Label>
                Current Price
              </Label>

              <input
                type="number"
                step="0.01"
                value={editCurrentRatingPrice}
                onChange={(e) =>
                  setEditCurrentRatingPrice(e.target.value)
                }
                placeholder="e.g. 125.50"
                disabled={updateLoading}
                className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-[13px] text-gray-700 shadow-theme-xs outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
              />
            </div>

          </div>

          {/* PREVIOUS RATING */}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

            <div>
              <Label>
                Previous Rating
              </Label>

              <select
                value={editPreviousRating}
                onChange={(e) =>
                  setEditPreviousRating(e.target.value)
                }
                disabled={updateLoading}
                className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-[13px] text-gray-700 shadow-theme-xs outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
              >
                <option value="">
                  Select Rating
                </option>
                <option value="BUY">
                  BUY
                </option>
                <option value="HOLD">
                  HOLD
                </option>
                <option value="SELL">
                  SELL
                </option>
              </select>
            </div>

            <div>
              <Label>
                Previous Period
              </Label>

              <input
                type="text"
                value={editPreviousRatingPeriod}
                onChange={(e) =>
                  setEditPreviousRatingPeriod(e.target.value)
                }
                placeholder="e.g. 3 months ago"
                disabled={updateLoading}
                className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-[13px] text-gray-700 shadow-theme-xs outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
              />
            </div>

            <div>
              <Label>
                Previous Price
              </Label>

              <input
                type="number"
                step="0.01"
                value={editPreviousRatingPrice}
                onChange={(e) =>
                  setEditPreviousRatingPrice(e.target.value)
                }
                placeholder="e.g. 110.00"
                disabled={updateLoading}
                className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-[13px] text-gray-700 shadow-theme-xs outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
              />
            </div>

          </div>

          {/* DOCUMENT TITLE */}

          <div>
            <Label>
              Document Title
            </Label>

            <input
              type="text"
              value={editDocumentTitle}
              onChange={(e) =>
                setEditDocumentTitle(e.target.value)
              }
              placeholder="Enter document title"
              disabled={updateLoading}
              className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-[13px] text-gray-700 shadow-theme-xs outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
            />
          </div>

          {/* PDF */}

          <div>
            <Label>
              Replace PDF
            </Label>

            <div className="rounded-md border border-dashed border-gray-300 p-3 dark:border-gray-700">
              <input
                type="file"
                accept="application/pdf"
                disabled={updateLoading}
                onChange={(e) =>
                  setEditPdf(
                    e.target.files?.[0] || null
                  )
                }
                className="block w-full text-[13px] text-gray-600 dark:text-gray-400"
              />
            </div>

            {selectedResearch?.document_url && !editPdf && (
              <p className="mt-1.5 text-[12px] text-gray-400">
                Existing PDF will remain unchanged if you
                don't select a new file.
              </p>
            )}

            {editPdf && (
              <p className="mt-1.5 text-[12px] text-success-600">
                New PDF selected: {editPdf.name}
              </p>
            )}
          </div>

          {/* BUTTONS */}

          <div className="flex items-center justify-end gap-2">

            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setIsEditOpen(false)
              }
              disabled={updateLoading}
            >
              Cancel
            </Button>

            <Button
              size="sm"
              disabled={updateLoading}
            >
              {updateLoading
                ? "Updating..."
                : "Update"}
            </Button>

          </div>

        </form>

      </Modal>

      {/* ---------------- DELETE CONFIRM ---------------- */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete research report?"
        description={deleteTarget ? `This will permanently remove "${deleteTarget.symbol}".` : undefined}
        loading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget.id)}
      />
    </>
  );
}
