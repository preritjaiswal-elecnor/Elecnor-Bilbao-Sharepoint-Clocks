// Elecnor Madrid — stock proxy (independent instance)
// Route: /api/stock?symbol=ENO.MC&range=1d&interval=1d
//
// Proxies Yahoo Finance's chart endpoint. Yahoo rejects requests without a
// browser-like User-Agent, so we spoof one. Short cache to stay fresh.

export async function onRequest(context) {
  const url = new URL(context.request.url);

  const symbol = url.searchParams.get("symbol") || "ENO.MC";
  const range = url.searchParams.get("range") || "1d";
  const interval = url.searchParams.get("interval") || "1d";

  const target =
    `https://query1.finance.yahoo.com/v8/finance/chart/` +
    `${encodeURIComponent(symbol)}?range=${encodeURIComponent(range)}` +
    `&interval=${encodeURIComponent(interval)}`;

  try {
    let resp = await fetch(target, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        Accept: "application/json",
      },
    });

    // query1 occasionally rate-limits; fall back to query2 automatically.
    if (!resp.ok) {
      const alt = target.replace("query1.finance", "query2.finance");
      resp = await fetch(alt, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
            "(KHTML, like Gecko) Chrome/120.0 Safari/537.36",
          Accept: "application/json",
        },
      });
    }

    const body = await resp.text();
    return new Response(body, {
      status: resp.status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
}
