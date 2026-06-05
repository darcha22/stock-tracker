import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const API_KEY = process.env.FINNHUB_API_KEY ?? '';
const BASE = 'https://finnhub.io/api/v1';

async function fh(path: string) {
  const res = await fetch(`${BASE}${path}&token=${API_KEY}`, {
    headers: { 'X-Finnhub-Token': API_KEY },
    next: { revalidate: 300 }, // cache 5 min
  });
  if (!res.ok) throw new Error(`Finnhub error: ${res.status}`);
  return res.json();
}

function round(n: number | null | undefined, d = 2): number | null {
  if (n == null || isNaN(n)) return null;
  return parseFloat(n.toFixed(d));
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { ticker: string } }
) {
  const ticker = params.ticker.toUpperCase().trim();

  if (!API_KEY) {
    return NextResponse.json({ error: 'FINNHUB_API_KEY not set in environment variables.' }, { status: 500 });
  }

  try {
    const today = new Date();
    const from = new Date(today);
    from.setDate(today.getDate() - 7);
    const toStr = today.toISOString().slice(0, 10);
    const fromStr = from.toISOString().slice(0, 10);

    const [quote, profile, metrics, news, earnings] = await Promise.all([
      fh(`/quote?symbol=${ticker}`),
      fh(`/stock/profile2?symbol=${ticker}`),
      fh(`/stock/metric?symbol=${ticker}&metric=all`),
      fh(`/company-news?symbol=${ticker}&from=${fromStr}&to=${toStr}`),
      fh(`/calendar/earnings?symbol=${ticker}`),
    ]);

    if (!quote.c || quote.c === 0) {
      return NextResponse.json({ error: `Ticker "${ticker}" not found.` }, { status: 404 });
    }

    const price = quote.c;
    const m = metrics.metric ?? {};

    // PE ratios
    const trailingPE = round(m.peTTM ?? m.peNormalizedAnnual);
    const forwardPE = round(m.forwardPE ?? null);

    // Fwd PE 2026: price / forward EPS estimate if available
    let fwdPE2026: number | null = null;
    const fwdEps = m.epsForward ?? m['epsNormalizedAnnual'];
    if (fwdEps && price) fwdPE2026 = round(price / fwdEps);

    // Next earnings date
    let nextEarnings: string | null = null;
    try {
      const upcoming = (earnings.earningsCalendar ?? [])
        .filter((e: any) => e.date >= toStr)
        .sort((a: any, b: any) => a.date.localeCompare(b.date));
      if (upcoming[0]) {
        nextEarnings = new Date(upcoming[0].date).toLocaleDateString('en-US', {
          year: 'numeric', month: 'short', day: 'numeric',
        });
      }
    } catch {}

    // Latest EPS
    let latestEpsActual: number | null = null;
    let latestEpsPeriod: string | null = null;
    try {
      const past = (earnings.earningsCalendar ?? [])
        .filter((e: any) => e.date < toStr && e.epsActual != null)
        .sort((a: any, b: any) => b.date.localeCompare(a.date));
      if (past[0]) {
        latestEpsActual = round(past[0].epsActual);
        latestEpsPeriod = new Date(past[0].date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      }
    } catch {}

    // News (top 5)
    const newsItems = (Array.isArray(news) ? news : []).slice(0, 5).map((n: any) => ({
      title: n.headline ?? '',
      url: n.url ?? '',
      source: n.source ?? '',
      time: n.datetime
        ? new Date(n.datetime * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : null,
    }));

    return NextResponse.json({
      ticker,
      name: profile.name ?? ticker,
      price: round(price),
      changePct: round(((quote.c - quote.pc) / quote.pc) * 100),
      trailingPE,
      forwardPE,
      fwdPE2026,
      fwdPE2028: null,
      trailingEps: round(m.epsTTM ?? m.epsNormalizedAnnual),
      forwardEps: round(fwdEps),
      latestEpsActual,
      latestEpsPeriod,
      nextEarnings,
      marketCap: profile.marketCapitalization ? Math.round(profile.marketCapitalization * 1e6) : null,
      sector: profile.finnhubIndustry ?? null,
      fiftyTwoWeekHigh: round(m['52WeekHigh']),
      fiftyTwoWeekLow: round(m['52WeekLow']),
      news: newsItems,
    });

  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message ?? 'Unknown error' }, { status: 500 });
  }
}
