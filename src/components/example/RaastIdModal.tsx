"use client";

import React, { useState } from "react";
import Button from "../ui/button/Button";
import { Modal } from "../ui/modal";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import { useModal } from "../../hooks/useModal";
import supabase from "../../../SupabaseConfig";
import { toast } from "sonner";

interface RaastModalProps {
  setValue: (value: boolean) => void;
}

interface RaastResult {
  clientname: string;
  raastiban: string;
  clientcode: string;
  folionumber: string;
}

export default function RaastIdModal({
  setValue,
}: RaastModalProps) {
  const { isOpen, openModal, closeModal } = useModal();

  const [clientCode, setClientCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [result, setResult] = useState<RaastResult | null>(
    null
  );

  const [isRaastSaved, setIsRaastSaved] =
    useState(false);

  const handleClose = () => {
    setClientCode("");
    setResult(null);
    setError(null);
    setIsRaastSaved(false);
    closeModal();
  };

  const getRaastRecordByClientCode = async (
    code: string
  ) => {
    const { data, error } = await supabase
      .from("raastids")
      .select("*")
      .eq("clientcode", code.trim())
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    return data;
  };

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (!clientCode.trim()) {
      setError("Please enter client code");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Check if already exists
      const existingRecord =
        await getRaastRecordByClientCode(
          clientCode
        );

      if (existingRecord) {
        setResult(existingRecord);
        setIsRaastSaved(true);

        toast.success(
          "Raast ID already exists"
        );

        return;
      }

      // Generate Raast ID API Call
      const response = await fetch(
        `https://trade.iel.net.pk:9089/api/generatePaymentId/${clientCode}`,
        {
          method: "GET",
          headers: {
            authKey:
              "E6AA2EAE24FFB9FCE1762EB5844E1",
          },
        }
      );

      const data = await response.json();

      if (
        !response.ok ||
        data?.responseCode !== "00"
      ) {
        throw new Error(
          data?.errorRemarks ||
            "Failed to generate Raast ID"
        );
      }

      const raastInfo = {
        folionumber: data.folioNumber,
        clientname: data.clientName,
        clientcode: data.clientCode,
        raastiban: data.raastIBAN,
      };

      // Save into Supabase
      const { error: insertError } =
        await supabase
          .from("raastids")
          .insert([raastInfo]);

      if (insertError) throw insertError;

      setResult(raastInfo);
      setIsRaastSaved(true);

      setValue(true);

      toast.success(
        "Raast ID generated successfully"
      );
    } catch (err) {
      console.error(
        "Generate Raast ID error:",
        err
      );

      let errorMessage =
        "Something went wrong";

      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (
        err &&
        typeof err === "object" &&
        "message" in err
      ) {
        errorMessage = (
          err as { message: string }
        ).message;
      }

      setError(errorMessage);

      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result?.raastiban) return;

    try {
      await navigator.clipboard.writeText(
        result.raastiban
      );

      toast.success("IBAN copied");
    } catch (err) {
      console.error("Copy error:", err);
      toast.error("Unable to copy IBAN");
    }
  };

  return (
    <>
      <Button size="sm" onClick={openModal}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        Generate Raast ID
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        className="max-w-[584px] p-5 lg:p-10"
      >
        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          <h4 className="text-[15px] font-semibold text-gray-800 dark:text-white/90">
            Generate Raast ID
          </h4>

          {/* Client Code */}
          <div>
            <Label>
              Client Code{" "}
              <span className="text-error-500">
                *
              </span>
            </Label>

            <Input
              type="text"
              placeholder="Enter Client Code"
              defaultValue={clientCode}
              onChange={(e) =>
                setClientCode(e.target.value)
              }
              disabled={
                loading || isRaastSaved
              }
            />
          </div>

          {/* Submit Button */}
          <div>
            <Button
              size="sm"
              disabled={
                loading || isRaastSaved
              }
              className="w-full bg-brand-500 hover:bg-brand-600 text-white"
            >
              {isRaastSaved
                ? "Already Generated"
                : loading
                ? "Please wait..."
                : "Generate"}
            </Button>
          </div>

          {/* Info Text */}
          <p className="text-sm text-gray-500">
            Enter the client code and click
            generate to retrieve the Raast
            ID details.
          </p>

          {/* Result */}
          {result && (
            <div className="space-y-4 rounded-xl border border-green-200 bg-green-50 p-5 dark:border-green-800 dark:bg-green-900/10">
              <div className="text-center">
                <p className="text-green-600 text-sm">
                  Raast ID generated for
                </p>

                <h3 className="mt-1 text-lg font-bold text-green-700">
                  {result.clientname}
                </h3>
              </div>

              <div className="rounded-lg bg-white p-4 dark:bg-gray-800">
                <div className="flex items-center justify-between py-2 border-b dark:border-gray-700">
                  <span className="text-sm text-gray-500">
                    Client Code
                  </span>

                  <span className="font-semibold text-sm">
                    {result.clientcode}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-500">
                    Folio Number
                  </span>

                  <span className="font-semibold text-sm">
                    {result.folionumber}
                  </span>
                </div>
              </div>

              <div className="rounded-lg bg-white p-4 text-center dark:bg-gray-800">
                <p className="break-all text-base font-semibold text-gray-800 dark:text-white">
                  {result.raastiban}
                </p>

                <Button
                  size="sm"
                  variant="outline"
                  className="mt-4"
                  onClick={handleCopy}
                >
                  Copy IBAN
                </Button>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 mt-6">
            <Button
              size="sm"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Close
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}