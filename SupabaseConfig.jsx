import { createClient } from "@supabase/supabase-js";

// Which Supabase project the panel talks to.
//
// Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in `.env.local`
// (git-ignored) to point at another project, e.g. the local Supabase stack.
// When they are not set, the live project below is used, so production builds
// and anyone without a `.env.local` are unaffected.
//
// Next.js only inlines NEXT_PUBLIC_* variables when they are read as literal
// `process.env.NAME` expressions, so do not refactor these into a lookup.
const LIVE_URL = "https://bfxmfaakufrmzcxhtgfw.supabase.co";
const LIVE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmeG1mYWFrdWZybXpjeGh0Z2Z3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4MTQzMTIsImV4cCI6MjA3NTM5MDMxMn0.qtNn0qXNhn8ol8fTSb2Hp9nQkYfFA2Y_Zec4LuISPZQ";

export const SupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || LIVE_URL;
export const SupabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || LIVE_ANON_KEY;

const supabase = createClient(SupabaseUrl, SupabaseAnonKey);

export default supabase;
