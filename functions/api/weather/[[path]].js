// Elecnor Madrid — weather proxy (independent instance)
// Route: /api/weather/v1/forecast?latitude=..&longitude=..&current=..
//
// Transparent proxy to Open-Meteo. The frontend builds a normal Open-Meteo
// path and this just forwards it, adding CORS + a 15-min edge cache.

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const path = url.pathname.replace(/^\/api\/weather/, "") || "/";
  const target = `https://api.open-meteo.com${path}${url.search}`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);

  try {
    const resp = await fetch(target, {
      signal: ctrl.signal,
      headers: { Accept: "application/json", "User-Agent": "elecnor-madrid-clocks/1.0" },
      cf: { cacheTtl: 900, cacheEverything: true },
    });
    clearTimeout(timer);
    const body = await resp.text();
    return new Response(body, {
      status: resp.status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=900",
      },
    });
  } catch (e) {
    clearTimeout(timer);
    return new Response(
      JSON.stringify({
        error: e.name === "AbortError" ? "upstream timeout (10s)" : e.message,
        name: e.name,
        target,
      }),
      {
        status: 502,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      }
    );
  }
}
