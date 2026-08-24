"use client";

import React, { useState } from "react";
import Button from "../ui/button/Button";
import { Modal } from "../ui/modal";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import { useModal } from "../../hooks/useModal";
import supabase from "../../../SupabaseConfig";

// ─── Tiptap imports ────────────────────────────────────────────────
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

const extensions = [
  StarterKit.configure({
    heading: {
      levels: [1, 2, 3],
    },
    bulletList: {
      HTMLAttributes: {
        class: "list-disc ml-4",
      },
    },
    orderedList: {
      HTMLAttributes: {
        class: "list-decimal ml-4",
      },
    },
  }),
];

interface BlogsModalProps {
  setValue: (value: boolean) => void;   // or React.Dispatch<React.SetStateAction<boolean>>
}

export default function BlogsModal({ setValue }: BlogsModalProps) {
  const { isOpen, openModal, closeModal } = useModal();

  const [title, setTitle] = useState("");
  const [image, setImage] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tiptap editor with initial <p> content
  const editor = useEditor({
    extensions,
    content: "<p>Start writing your blog here...</p>", // ← Always starts with a visible paragraph
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[180px] p-4 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100",
      },
    },
  });

  const handleClose = () => {
    setTitle("");
    if (editor) editor.commands.setContent("<p>Start writing your blog here...</p>");
    setImage(null);
    setError(null);
    closeModal();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !editor?.getHTML() || editor?.isEmpty || !image) {
      setError("All fields are required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Upload image
      const fileName = `${Date.now()}-${image.name}`;
      const { error: uploadError } = await supabase.storage
        .from("Images")
        .upload(fileName, image);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("Images")
        .getPublicUrl(fileName);

      const imageUrl = publicUrlData.publicUrl;

      // Save blog
      const { error: dbError } = await supabase.from("blogs").insert([
        {
          title,
          desc: editor.getHTML(),
          img: imageUrl,
        },
      ]);

      if (dbError) throw dbError;

      setValue(true);
      handleClose();
    } catch (err) {
      let errorMessage = "Something went wrong";

  if (err instanceof Error) {
    errorMessage = err.message;
  } else if (err && typeof err === "object" && "message" in err) {
    // Handle Supabase/Postgrest/Storage errors that are plain objects
    errorMessage = (err as { message: string }).message;
  }
  setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Helper to check active state more reliably
  const isActive = (name: string, attrs = {}) => {
    return editor?.isActive(name, attrs) ?? false;
  };

  return (
    <>
      <Button size="sm" onClick={openModal}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        Add Blog
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        className="max-w-[584px] p-5 lg:p-10 my-[500px] top-[40px]"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <h4 className="text-[15px] font-semibold text-gray-800 dark:text-white/90">
            Add Blog
          </h4>

          {/* Title */}
          <div>
            <Label>
              Title <span className="text-error-500">*</span>
            </Label>
            <Input
              type="text"
              placeholder="Enter blog title"
              defaultValue={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Rich Description */}
          <div>
            <Label>
              Description <span className="text-error-500">*</span>
            </Label>
            <div className="mt-1 border border-gray-300 rounded-md overflow-hidden bg-white dark:bg-gray-800 dark:border-gray-600">
              {/* Improved Toolbar – clearer active state */}
              <div className="flex flex-wrap gap-1.5 p-2.5 border-b bg-gray-50 dark:bg-gray-700">
                <button
                  type="button"
                  onClick={() => editor?.chain().focus().toggleBold().run()}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    isActive("bold")
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500"
                  }`}
                  disabled={loading || !editor}
                  title="Bold (Ctrl+B)"
                >
                  <strong>B</strong>
                </button>

                <button
                  type="button"
                  onClick={() => editor?.chain().focus().toggleItalic().run()}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    isActive("italic")
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500"
                  }`}
                  disabled={loading || !editor}
                  title="Italic (Ctrl+I)"
                >
                  <em>I</em>
                </button>

                <button
                  type="button"
                  onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    isActive("heading", { level: 2 })
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500"
                  }`}
                  disabled={loading || !editor}
                  title="Heading 2"
                >
                  H2
                </button>

                <button
                  type="button"
                  onClick={() => editor?.chain().focus().toggleBulletList().run()}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    isActive("bulletList")
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500"
                  }`}
                  disabled={loading || !editor}
                  title="Bullet List"
                >
                  • List
                </button>

                {/* Bonus: Add Ordered List button */}
                <button
                  type="button"
                  onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    isActive("orderedList")
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500"
                  }`}
                  disabled={loading || !editor}
                  title="Numbered List"
                >
                  1. List
                </button>
              </div>

              <EditorContent editor={editor} />
            </div>
          </div>

          {/* Image Upload */}
          <div>
            <Label>
              Image <span className="text-error-500">*</span>
            </Label>
            <div className="rounded-md border border-dashed border-gray-300 p-3 dark:border-gray-700">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImage(e.target.files?.[0] || null)}
                disabled={loading}
                className="w-full text-[13px] text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-[13px] file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                required
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>

            <Button
              size="sm"
              disabled={loading || !editor}
            >
              {loading ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}