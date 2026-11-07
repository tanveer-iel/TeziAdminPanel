import supabase from "../../SupabaseConfig";
import type { FinancialYear } from "./financialYear";

const TABLE = "financial_years";

/**
 * Returns the id of the financial_years row for this label, creating the row
 * first if it does not exist yet.
 *
 * Safe when two people add a document for a brand-new year at the same time:
 * the unique constraint on `label` makes the second insert a no-op, and the
 * id is then read back.
 */
export async function ensureFinancialYear(fy: FinancialYear): Promise<number | string> {
  const { data: existing, error: lookupError } = await supabase
    .from(TABLE)
    .select("id")
    .eq("label", fy.label)
    .maybeSingle();
  if (lookupError) throw lookupError;
  if (existing) return existing.id;

  const { error: insertError } = await supabase
    .from(TABLE)
    .upsert(
      { label: fy.label, start_date: fy.startDate, end_date: fy.endDate },
      { onConflict: "label", ignoreDuplicates: true }
    );
  if (insertError) throw insertError;

  const { data, error } = await supabase
    .from(TABLE)
    .select("id")
    .eq("label", fy.label)
    .single();
  if (error) throw error;
  return data.id;
}
