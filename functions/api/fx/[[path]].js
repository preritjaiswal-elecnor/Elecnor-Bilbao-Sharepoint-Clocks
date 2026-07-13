// Elecnor Madrid — FX proxy (independent instance)
// Route: /api/fx/latest?from=EUR&to=AUD,NZD
//        /api/fx/2026-06-19?from=EUR&to=AUD,NZD   (historical)
//
// Frankfurter only allows EUR as the true base, so we always fetch in EUR
// and convert to the requested base ourselves. This keeps arbitrary base
// currencies (AUD, etc.) working without upstream 5xx errors.

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const path = url.pathname.replace(/^\/api\/fx/, "") || "/";

  const m = path.match(/^\/(latest|\d{4}-\d{2}-\d{2})\/?$/);

  const from = (url.searchParams.get("from") || "EUR").toUpperCase();
  const toList = (url.searchParams.get("to") || "")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);

  const baseHeaders = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  };
  const noCache = { ...baseHeaders, "Cache-Control": "no-store" };
  const okCache = { ...baseHeaders, "Cache-Control": "public, max-age=3600" };

  try {
    if (m) {
      const endpoint = m[1]; // "latest" or the date string

      const needed = new Set([from, ...toList]);
      needed.delete("EUR"); // EUR is the base, always 1
      const symbols = [...needed].join(",");

      const target = symbols
        ? `https://api.frankfurter.app/${endpoint}?from=EUR&to=${symbols}`
        : `https://api.frankfurter.app/${endpoint}?from=EUR`;

      const resp = await fetch(target);
      if (!resp.ok) throw new Error(`upstream ${resp.status}`);
      const data = await resp.json();

      const eurRates = { EUR: 1, ...data.rates };
      const fromRate = eurRates[from];
      if (!fromRate) throw new Error(`unknown base currency ${from}`);

      const rates = {};
      for (const sym of toList) {
        if (eurRates[sym]) rates[sym] = eurRates[sym] / fromRate;
      }

      const out = { amount: 1, base: from, date: data.date, rates };
      return new Response(JSON.stringify(out), { status: 200, headers: okCache });
    }

    // Fallback passthrough (uncached).
    const passthrough = `https://api.frankfurter.app${path}${url.search}`;
    const resp = await fetch(passthrough);
    const body = await resp.text();
    return new Response(body, {
      status: resp.ok ? resp.status : 200,
      headers: noCache,
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message, rates: {} }), {
      status: 200,
      headers: noCache,
    });
  }
}
