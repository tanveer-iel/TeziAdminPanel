// Local copy of the live `swift-responder` edge function, as pasted by the project owner.
// NOTE: the original header comment said "supabase/functions/sync-stocks/index.ts".
// This function ignores the { title, body } the admin panel's Notification page sends;
// it syncs the stocks table from the IEL PSX API.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Supabase client with service role for full access
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Fetch stocks from PSX API
    const apiResponse = await fetch('https://ielapis.u2ventures.io/api/psxApi/search/all-stocks/');
    if (!apiResponse.ok) {
      throw new Error(`API fetch failed: ${apiResponse.status}`);
    }
    const apiData = await apiResponse.json();

    // Extract stocks array and prepare for upsert (assuming structure: { stocks: [...], total_stocks: number })
    const stocks = apiData.stocks || [];
    const upsertData = stocks.map(stock => ({
      symbol: stock.symbol,
      name: stock.name,
    }));

    // Upsert into stocks table (on conflict update name)
    const { data: insertedData, error } = await supabase
      .from('stocks')
      .upsert(upsertData, { onConflict: 'symbol' });

    if (error) {
      throw error;
    }

    // Update updated_at for all rows (optional, via trigger or here)
    await supabase
      .from('stocks')
      .update({ updated_at: new Date().toISOString() });

    return new Response(
      JSON.stringify({
        message: `Successfully synced ${stocks.length} stocks!`,
        total_synced: stocks.length,
        inserted: insertedData?.length || 0,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Sync error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
