import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const YF = 'https://query1.finance.yahoo.com';
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json',
  'Accept-Language': 'en-US,en;q=0.9',
};

export async function GET(
  _req: NextRequest,
  { params }: { params: { ticker: string } }
) {
  const ticker = params.ticker.toUpperCase().trim();

  try {
    const [summaryRes, searchRes] = await Promise.all([
      fetch(
        `${YF}/v11/finance/quoteSummary/${ticker}?modules=price,summaryDetail,defaultKeyStatistics,calendarEvents,earningsTrend,earningsHistory`,
        { headers: HEADERS }
      ),
      fetch(
        `${YF}/v1/finance/search?q=${ticker}&newsCount=5&quotesCount=1&enableFuzzyQuery=false`,
        { headers: HEADERS }
      ),
    ]);

    const summaryJson = await summaryRes.json();
    const searchJson = await searchRes.json();

    if (summaryJson.quoteSummary?.error || !summaryJson.quoteSummary?.result?.[0]) {
      return NextResponse.json({ error: `Ticker "${ticker}" not found.` }, { status: 404 });
    }

    const r = summaryJson.quoteSummary.result[0];
    const price_mod = r.price ?? {};
    const detail = r.summaryDetail ?? {};
    const calendar = r.calendarEvents ?? {};
    const trend = r.earningsTrend?.trend ?? [];
    const history = r.earningsHistory?.history ?? [];

    const price = price_mod.regularMarketPrice?.raw ?? null;
    const changePct = price_mod.regularMarketChangePercent?.raw ?? null;

    // Forward PE by year from earningsTrend
    let fwdPE2026: number | null = null;
    try {
      const curr = trend.find((t: any) => t.period === '0y');
      const eps0y = curr?.earningsEstimate?.avg?.raw;
      if (eps0y && price) fwdPE2026 = parseFloat((price / eps0y).toFixed(1));
    } catch {}

    // Next earnings date
    let nextEarnings: string | null = null;
    try {
      const dates = calendar.earnings?.earningsDate ?? [];
      if (dates[0]?.raw) {
        nextEarnings = new Date(dates[0].raw * 1000).toLocaleDateString('en-US', {
          year: 'numeric', month: 'short', day: 'numeric',
        });
      }
    } catch {}

    // Latest reported EPS
    let latestEpsActual: number | null = null;
    let latestEpsPeriod: string | null = null;
    try {
      if (history.length > 0) {
        const latest = history[history.length - 1];
        latestEpsActual = latest.epsActual?.raw ?? null;
        if (latest.quarter?.raw) {
          latestEpsPeriod = new Date(latest.quarter.raw * 1000).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short',
          });
        }
      }
    } catch {}

    // News
    const news = (searchJson.news ?? []).slice(0, 5).map((n: any) => ({
      title: n.title ?? '',
      url: n.link ?? '',
      source: n.publisher ?? '',
      time: n.providerPublishTime
        ? new Date(n.providerPublishTime * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : null,
    }));

    return NextResponse.json({
      ticker,
      name: price_mod.longName ?? price_mod.shortName ?? ticker,
      price,
      changePct,
      trailingPE: detail.trailingPE?.raw ?? null,
      forwardPE: detail.forwardPE?.raw ?? null,
      fwdPE2026,
      fwdPE2028: null, // not available from Yahoo Finance free data
      trailingEps: price_mod.epsTrailingTwelveMonths?.raw ?? null,
      forwardEps: price_mod.epsForward?.raw ?? null,
      latestEpsActual,
      latestEpsPeriod,
      nextEarnings,
      marketCap: price_mod.marketCap?.raw ?? null,
      sector: price_mod.sector ?? null,
      fiftyTwoWeekHigh: detail.fiftyTwoWeekHigh?.raw ?? null,
      fiftyTwoWeekLow: detail.fiftyTwoWeekLow?.raw ?? null,
      news,
    });

  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message ?? 'Unknown error' }, { status: 500 });
  }
}
