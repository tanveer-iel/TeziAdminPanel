// portfolio-sync: keeps client_portfolio_latest / client_holdings_latest fresh and writes history
// (client_portfolio_data + client_holdings_data) ONLY when something changed (or once at end of day).
//
// Modes (POST JSON body {"mode": "..."}):
//   client : on demand for ONE customer. Caller is a signed-in user (their JWT). The client code is
//            taken from public."ClientCode" for that user; any clientCode in the body is ignored.
//            Cached for CACHE_SECONDS.
//   probe  : daily ~11:00 PKT (cron). Decides if the exchange is trading today -> market_days.
//   active : during market hours (cron). Refreshes clients with a live trading session.
//   eod    : after close (cron). Refreshes ALL clients and always saves a history snapshot.
//   probe/active/eod need the service-role key OR the header `x-cron-secret: <CRON_SECRET>` (the schedule uses the
//   secret, so the service-role key never has to be stored in the database). Fails open: if unsure, treat the day as open.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const API_URL = "https://trade.iel.net.pk:1219/iel/portfolio"
const CACHE_SECONDS = 300
const CONCURRENCY = 3
const PROBE_CLIENT = Deno.env.get("PROBE_CLIENT_CODE") ?? "10053"
const PKT_OFFSET_MS = 5 * 3600 * 1000

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "" // set with: supabase secrets set CRON_SECRET=...
const db = createClient(SUPABASE_URL, SERVICE_KEY)

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })

// Karachi calendar date (YYYY-MM-DD) and the UTC instant when today's session starts (09:30 PKT).
const pktDate = () => new Date(Date.now() + PKT_OFFSET_MS).toISOString().slice(0, 10)
const sessionStartUtc = (d: string) => new Date(new Date(`${d}T09:30:00Z`).getTime() - PKT_OFFSET_MS).toISOString()

const httpClient = Deno.createHttpClient({ dangerousAllowUnauthorizedCerts: true }) // TODO: fix server cert

async function fetchPortfolio(clientCode: string) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientCode }),
    client: httpClient,
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new Error(`trading API status ${res.status}`)
  const data = await res.json()
  const detail = data?.detailInformation?.[0]
  if (!detail?.portfolio) throw new Error("Invalid API response: detailInformation missing")
  return { portfolio: detail.portfolio, holdings: (detail.holdings ?? []) as any[] }
}

async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("")
}

function holdingRow(clientCode: string, h: any) {
  return {
    client_code: clientCode,
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
  }
}

type SyncResult = { clientCode: string; changed: boolean; snapshotSaved: boolean; holdings: number; cached?: boolean }

async function syncClient(clientCode: string, opts: { alwaysSnapshot?: boolean; useCache?: boolean }): Promise<SyncResult> {
  const { data: latest } = await db.from("client_portfolio_latest").select("*").eq("client_code", clientCode).maybeSingle()

  if (opts.useCache && latest && Date.now() - new Date(latest.fetched_at).getTime() < CACHE_SECONDS * 1000) {
    return { clientCode, changed: false, snapshotSaved: false, holdings: 0, cached: true }
  }

  const { portfolio: p, holdings } = await fetchPortfolio(clientCode)
  const rows = holdings.map((h) => holdingRow(clientCode, h)).sort((a, b) => String(a.security).localeCompare(String(b.security)))
  const summary = {
    cash_unblocked: p.cashUnblocked, cash_blocked: p.cashBlocked, cash_balance: p.cashBalance,
    limit_withdrawal: p.limitWithdrawal, grand_total: p.grandTotal, custody_value: p.custodyValue,
    total_profit_loss: p.totalProfitLoss,
  }
  const hash = await sha256(JSON.stringify({ summary, rows }))
  const changed = !latest || latest.state_hash !== hash
  const now = new Date().toISOString()

  if (!changed && !opts.alwaysSnapshot) {
    await db.from("client_portfolio_latest").update({ fetched_at: now }).eq("client_code", clientCode)
    return { clientCode, changed: false, snapshotSaved: false, holdings: rows.length }
  }

  // History snapshot (summary + holdings)
  const { data: snap, error: snapErr } = await db
    .from("client_portfolio_data").insert({ client_code: clientCode, ...summary }).select("id").single()
  if (snapErr) throw snapErr
  if (rows.length > 0) {
    const { error } = await db.from("client_holdings_data").insert(rows.map((r) => ({ ...r, snapshot_id: snap.id })))
    if (error) throw error
  }

  // Latest state (what the app reads)
  const { error: lErr } = await db.from("client_portfolio_latest").upsert({
    client_code: clientCode, snapshot_id: snap.id, ...summary, state_hash: hash,
    fetched_at: now, changed_at: changed ? now : (latest?.changed_at ?? now),
  })
  if (lErr) throw lErr
  if (rows.length > 0) {
    const { error } = await db.from("client_holdings_latest").upsert(rows.map((r) => ({ ...r, updated_at: now })))
    if (error) throw error
  }
  // remove stocks no longer held
  const keep = rows.map((r) => r.security)
  const del = db.from("client_holdings_latest").delete().eq("client_code", clientCode)
  const { error: dErr } = keep.length
    ? await del.not("security", "in", `(${keep.map((s) => `"${String(s).replace(/"/g, '\\"')}"`).join(",")})`)
    : await del
  if (dErr) throw dErr

  return { clientCode, changed, snapshotSaved: true, holdings: rows.length }
}

async function runPool(codes: string[], opts: Parameters<typeof syncClient>[1]) {
  const results: (SyncResult | { clientCode: string; error: string })[] = []
  let i = 0
  const worker = async () => {
    while (i < codes.length) {
      const code = codes[i++]
      try { results.push(await syncClient(code, opts)) }
      catch (e) { console.error("SYNC ERROR", code, e); results.push({ clientCode: code, error: String((e as any)?.message ?? e) }) }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, codes.length) }, worker))
  return results
}

async function marketDay(date: string) {
  const { data } = await db.from("market_days").select("*").eq("trade_date", date).maybeSingle()
  return data as { is_open: boolean; forced: boolean } | null
}

// Did the exchange trade today? Infers it from the probe client's portfolio: prices only move
// when the market trades, so custody value / profit differs from the last pre-session snapshot.
async function probe(date: string) {
  const existing = await marketDay(date)
  if (existing?.forced) return { date, isOpen: existing.is_open, source: "forced", skipped: true }

  let isOpen = true
  let source = "probe"
  let detail: Record<string, unknown> = {}
  try {
    const { portfolio: p } = await fetchPortfolio(PROBE_CLIENT)
    const { data: base } = await db.from("client_portfolio_data")
      .select("custody_value,total_profit_loss,created_at").eq("client_code", PROBE_CLIENT)
      .lt("created_at", sessionStartUtc(date)).order("created_at", { ascending: false }).limit(1).maybeSingle()
    if (!base) {
      source = "probe-no-baseline (assumed open)"
    } else {
      isOpen = Number(base.custody_value) !== Number(p.custodyValue) || Number(base.total_profit_loss) !== Number(p.totalProfitLoss)
      detail = { baseline: base, now: { custody_value: p.custodyValue, total_profit_loss: p.totalProfitLoss } }
    }
  } catch (e) {
    source = `probe-error (assumed open): ${String((e as any)?.message ?? e)}`
  }
  const { error } = await db.from("market_days").upsert({
    trade_date: date, is_open: isOpen, source, detail, checked_at: new Date().toISOString(),
  })
  if (error) throw error
  return { date, isOpen, source, detail }
}

serve(async (req) => {
  try {
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "")
    let body: any = {}
    try { body = await req.json() } catch (_) { /* empty */ }
    const mode = body?.mode ?? "client"
    const cronOk = CRON_SECRET !== "" && req.headers.get("x-cron-secret") === CRON_SECRET
    const privileged = cronOk || (token !== "" && token === SERVICE_KEY)
    const today = pktDate()

    if (mode === "client") {
      let userId: string | null = null
      if (!privileged) {
        const { data, error } = await db.auth.getUser(token)
        if (error || !data?.user) return json({ success: false, error: "Not signed in" }, 401)
        userId = data.user.id
      }
      let code: string | null = null
      if (userId) {
        const { data } = await db.from("ClientCode").select("cliendCode").eq("userId", userId).maybeSingle()
        code = data?.cliendCode ?? null
      } else {
        code = body?.clientCode ?? null // service role may name a client
      }
      if (!code) return json({ success: false, error: "No client code linked to this account" }, 404)
      return json({ success: true, mode, result: await syncClient(String(code), { useCache: true }) })
    }

    if (!privileged) return json({ success: false, error: "Forbidden" }, 403)

    if (mode === "probe") return json({ success: true, mode, ...(await probe(today)) })

    if (mode === "active" || mode === "eod") {
      const md = await marketDay(today)
      if (mode === "active" && !md) return json({ success: true, mode, skipped: "market-check has not run today" })
      if (md && !md.is_open) return json({ success: true, mode, skipped: "market closed today" })

      let codes: string[]
      if (mode === "active") {
        const { data } = await db.from("trading_auth").select("client_code")
          .eq("is_authenticate", true).gt("expire_at", new Date().toISOString())
        codes = [...new Set((data ?? []).map((r: any) => String(r.client_code)))]
      } else {
        const { data } = await db.from("ClientCode").select("cliendCode")
        codes = [...new Set((data ?? []).map((r: any) => String(r.cliendCode)).filter(Boolean))]
      }
      const results = await runPool(codes, { alwaysSnapshot: mode === "eod" })
      const failed = results.filter((r: any) => r.error).length
      return json({ success: true, mode, date: today, clients: codes.length, failed, results })
    }

    return json({ success: false, error: `Unknown mode ${mode}` }, 400)
  } catch (err) {
    console.error("FUNCTION ERROR:", err)
    return json({ success: false, error: (err as any)?.message ?? String(err) }, 500)
  }
})
