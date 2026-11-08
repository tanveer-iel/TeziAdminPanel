import supabase from "../../SupabaseConfig";

export const PDF_BUCKET = "PDF Files";

/**
 * The object name inside the PDF bucket for a stored public URL, or null if the
 * URL does not point at this bucket (old links to other places are left alone).
 *   .../storage/v1/object/public/PDF%20Files/123-name.pdf  ->  "123-name.pdf"
 */
export function pdfObjectName(url: string | null | undefined): string | null {
  if (!url) return null;
  const marker = `/object/public/${encodeURIComponent(PDF_BUCKET)}/`;
  const at = url.indexOf(marker);
  if (at === -1) return null;
  const name = url.slice(at + marker.length).split("?")[0];
  try {
    return decodeURIComponent(name) || null;
  } catch {
    return null;
  }
}

/**
 * Removes a statement's old PDF from storage once nothing refers to it.
 *
 * Call this only AFTER the database change that stopped using the file has
 * succeeded, so a failed save never loses a file. It never throws: a problem
 * here must not turn a successful edit or delete into a failure.
 *
 * Returns true when the file was removed, false when it was kept on purpose
 * (still used by another statement, not in this bucket) or could not be removed.
 */
export async function removeOldPdf(oldUrl: string | null | undefined): Promise<boolean> {
  try {
    const name = pdfObjectName(oldUrl);
    if (!name) return false;

    // Another statement may point at the same file: keep it.
    const { count, error: countError } = await supabase
      .from("finanicial_statements")
      .select("id", { count: "exact", head: true })
      .eq("pdf", oldUrl as string);
    if (countError || (count ?? 0) > 0) return false;

    const { error } = await supabase.storage.from(PDF_BUCKET).remove([name]);
    if (error) {
      console.warn("Old PDF was not removed from storage:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("Old PDF was not removed from storage:", err);
    return false;
  }
}
