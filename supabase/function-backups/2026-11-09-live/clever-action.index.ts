import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  try {
    // -----------------------------
    // Supabase client
    // -----------------------------
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // -----------------------------
    // Read request body
    // -----------------------------
    let clientCode = "10053"

    try {
      const body = await req.json()
      if (body?.clientCodea) {
        clientCode = body.clientCodea
      }
    } catch (_) {
      // fallback to default
    }

    // -----------------------------
    // SSL bypass HTTP client
    // -----------------------------
    const client = Deno.createHttpClient({
      dangerousAllowUnauthorizedCerts: true,
    })

    // -----------------------------
    // Call external API (same as curl)
    // -----------------------------
    const apiResponse = await fetch(
      "https://trade.iel.net.pk:1219/iel/portfolio",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientCode,
        }),
        client,
        signal: AbortSignal.timeout(15000),
      }
    )

    if (!apiResponse.ok) {
      const errText = await apiResponse.text()
      console.error("API ERROR RESPONSE:", errText)
      throw new Error(`API failed with status ${apiResponse.status}`)
    }

    const data = await apiResponse.json()

    // -----------------------------
    // Validate response
    // -----------------------------
    const detail = data?.detailInformation?.[0]

    if (!detail) {
      throw new Error("Invalid API response: detailInformation missing")
    }

    const portfolio = detail.portfolio
    const holdings = detail.holdings || []

    // -----------------------------
    // Insert portfolio snapshot
    // -----------------------------
    const { data: portfolioRow, error: portfolioError } = await supabase
      .from("client_portfolio_data")
      .insert({
        client_code: clientCode,
        cash_unblocked: portfolio.cashUnblocked,
        cash_blocked: portfolio.cashBlocked,
        cash_balance: portfolio.cashBalance,
        limit_withdrawal: portfolio.limitWithdrawal,
        grand_total: portfolio.grandTotal,
        custody_value: portfolio.custodyValue,
        total_profit_loss: portfolio.totalProfitLoss,
      })
      .select()
      .single()

    if (portfolioError) {
      console.error("PORTFOLIO INSERT ERROR:", portfolioError)
      throw portfolioError
    }

    const snapshotId = portfolioRow.id

    // -----------------------------
    // Prepare holdings rows
    // -----------------------------
    const holdingsRows = holdings.map((h: any) => ({
      client_code: clientCode,
      snapshot_id: snapshotId,
      security: h.security,
      quantity: h.quantity,
      total_cost: h.totalCost,
      cost_per_unit: h.costPerUnit,
      current_price: h.currentPrice,
      current_value: h.currentValue,
      cap_gain_loss: h.capGainLoss,
      return_of_investment: h.retOfInv,
      portfolio_weight: h.pfWeight,
      api_grand_total: h.grandTotal,
      api_avg_cost: h.avgCost,
    }))

    // -----------------------------
    // Insert holdings
    // -----------------------------
    if (holdingsRows.length > 0) {
      const { error: holdingsError } = await supabase
        .from("client_holdings_data")
        .insert(holdingsRows)

      if (holdingsError) {
        console.error("HOLDINGS INSERT ERROR:", holdingsError)
        throw holdingsError
      }
    }

    // -----------------------------
    // Success response
    // -----------------------------
    return new Response(
      JSON.stringify({
        success: true,
        clientCode,
        snapshotId,
        holdingsInserted: holdingsRows.length,
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    )
  } catch (err) {
    console.error("FUNCTION ERROR:", err)

    return new Response(
      JSON.stringify({
        success: false,
        error: err.message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    )
  }
})
