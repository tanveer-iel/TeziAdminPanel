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
import supabase from "../../../SupabaseConfig";
import { toast } from "sonner";
import { Modal } from "../ui/modal";
import Label from "../form/Label";

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
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this research report?"
    );

    if (!confirmDelete) return;

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
      <div className="p-8 text-center text-gray-500">
        Loading Research Reports...
      </div>
    );
  }

  /* ================= ERROR ================= */

  if (error) {
    return (
      <div className="p-8 text-center text-red-500">
        {error}
      </div>
    );
  }

  /* ================= EMPTY ================= */

  if (researchData.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        No Research Reports found.
      </div>
    );
  }

  /* ================= TABLE ================= */

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>

                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Symbol
                </TableCell>

                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Case
                </TableCell>

                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Key Risk
                </TableCell>

                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Current Rating
                </TableCell>

                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Current Price
                </TableCell>

                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Previous Rating
                </TableCell>

                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Document
                </TableCell>

                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Action
                </TableCell>

              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">

              {researchData.map((item) => (

                <TableRow key={item.id}>

                  {/* SYMBOL */}
                  <TableCell className="px-4 py-3 font-medium text-gray-800 dark:text-white">
                    {item.symbol}
                  </TableCell>

                  {/* CASE */}
                  <TableCell className="px-4 py-3 text-gray-500">
                    <div className="max-w-[250px]">

                      {item.case_points?.length ? (
                        <ul className="list-disc pl-5 space-y-1">

                          {item.case_points.map((point, index) => (
                            <li key={index}>
                              {point}
                            </li>
                          ))}

                        </ul>
                      ) : (
                        "—"
                      )}

                    </div>
                  </TableCell>

                  {/* KEY RISK */}
                  <TableCell className="px-4 py-3 text-gray-500">
                    <div className="max-w-[220px]">
                      {item.key_risk || "—"}
                    </div>
                  </TableCell>

                  {/* CURRENT RATING */}
                  <TableCell className="px-4 py-3">

                    {item.current_rating ? (
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                          item.current_rating === "BUY"
                            ? "bg-green-100 text-green-700"
                            : item.current_rating === "SELL"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {item.current_rating}
                      </span>
                    ) : (
                      "—"
                    )}

                    {item.current_rating_date && (
                      <div className="mt-1 text-xs text-gray-400">
                        {item.current_rating_date}
                      </div>
                    )}

                  </TableCell>

                  {/* CURRENT PRICE */}
                  <TableCell className="px-4 py-3 text-gray-500">
                    {item.current_rating_price != null
                      ? `PKR ${item.current_rating_price}`
                      : "—"}
                  </TableCell>

                  {/* PREVIOUS */}
                  <TableCell className="px-4 py-3 text-gray-500">

                    {item.previous_rating || "—"}

                    {item.previous_rating_period && (
                      <div className="mt-1 text-xs text-gray-400">
                        {item.previous_rating_period}
                      </div>
                    )}

                    {item.previous_rating_price != null && (
                      <div className="mt-1 text-xs text-gray-400">
                        PKR {item.previous_rating_price}
                      </div>
                    )}

                  </TableCell>

                  {/* DOCUMENT */}
                  <TableCell className="px-4 py-3">

                    {item.document_url ? (
                      <Button
                        size="sm"
                        onClick={() =>
                          window.open(
                            item.document_url!,
                            "_blank"
                          )
                        }
                        className="bg-blue-600 text-white hover:bg-blue-700"
                      >
                        Open PDF
                      </Button>
                    ) : (
                      <span className="text-gray-400">
                        No PDF
                      </span>
                    )}

                    {item.document_title && (
                      <div className="mt-1 max-w-[180px] truncate text-xs text-gray-400">
                        {item.document_title}
                      </div>
                    )}

                  </TableCell>

                  {/* ACTION */}
                  <TableCell className="px-4 py-3">

                    <div className="flex gap-2">

                      <Button
                        size="sm"
                        className="bg-blue-500 text-white hover:bg-blue-600"
                        onClick={() => handleEdit(item)}
                      >
                        Edit
                      </Button>

                      <Button
                        size="sm"
                        className="bg-red-500 text-white hover:bg-red-600"
                        onClick={() => handleDelete(item.id)}
                      >
                        Delete
                      </Button>

                    </div>

                  </TableCell>

                </TableRow>

              ))}

            </TableBody>
          </Table>
        </div>
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

          <h4 className="text-lg font-medium text-gray-800 dark:text-white">
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
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-700 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
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
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-700 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
            />

            <p className="mt-1 text-xs text-gray-400">
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
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-700 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
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
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
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
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
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
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
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
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
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
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
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
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
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
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
            />
          </div>

          {/* PDF */}

          <div>
            <Label>
              Replace PDF
            </Label>

            <input
              type="file"
              accept="application/pdf"
              disabled={updateLoading}
              onChange={(e) =>
                setEditPdf(
                  e.target.files?.[0] || null
                )
              }
              className="w-full text-sm text-gray-600"
            />

            {selectedResearch?.document_url && !editPdf && (
              <p className="mt-2 text-xs text-gray-400">
                Existing PDF will remain unchanged if you
                don't select a new file.
              </p>
            )}

            {editPdf && (
              <p className="mt-2 text-xs text-green-600">
                New PDF selected: {editPdf.name}
              </p>
            )}
          </div>

          {/* BUTTONS */}

          <div className="flex justify-end gap-3">

            <Button
              variant="outline"
              onClick={() =>
                setIsEditOpen(false)
              }
              disabled={updateLoading}
            >
              Cancel
            </Button>

            <Button
              disabled={updateLoading}
              className="bg-brand-500 text-white"
            >
              {updateLoading
                ? "Updating..."
                : "Update"}
            </Button>

          </div>

        </form>

      </Modal>
    </>
  );
}