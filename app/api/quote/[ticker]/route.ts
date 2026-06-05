import { NextRequest, NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';

export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
  { params }: { params: { ticker: string } }
) {
  const ticker = params.ticker.toUpperCase();

  try {
    const [quote, summary, searchResult] = await Promise.allSettled([
      yahooFinance.quote(ticker),
      yahooFinance.quoteSummary(ticker, {
        modules: ['price', 'summaryDetail', 'defaultKeyStatistics', 'calendarEvents', 'earningsTrend', 'earningsHistory'],
      }),
      yahooFinance.search(ticker, { newsCount: 5, quotesCount: 0 }),
    ]);

    if (quote.status === 'rejected') {
      return NextResponse.json({ error: `Ticker "${ticker}" not found.` }, { status: 404 });
    }

    const q = quote.value;
    const s = summary.status === 'fulfilled' ? summary.value : null;
    const news = searchResult.status === 'fulfilled' ? searchResult.value.news ?? [] : [];

    const price = q.regularMarketPrice ?? null;

    // Forward PE estimates by year from earningsTrend
    let fwdPE2026: number | null = null;
    let fwdPE2028: number | null = null;

    try {
      const trends = s?.earningsTrend?.trend ?? [];
      for (const t of trends) {
        const eps = t.earningsEstimate?.avg ?? null;
        if (eps && price) {
          if (t.period === '0y') fwdPE2026 = parseFloat((price / eps).toFixed(1));
          if (t.period === '+1y') {
            // +1y from today (mid-2026) ≈ 2027 — label honestly
            // We'll return it as fwdEpsPlus1yr for the UI to label
          }
        }
      }
    } catch {}

    // Next earnings date
    let nextEarnings: string | null = null;
    try {
      const dates = s?.calendarEvents?.earnings?.earningsDate ?? [];
      if (dates.length > 0) {
        nextEarnings = new Date(dates[0] as Date).toLocaleDateString('en-US', {
          year: 'numeric', month: 'short', day: 'numeric',
        });
      }
    } catch {}

    // Latest reported EPS
    let latestEpsActual: number | null = null;
    let latestEpsPeriod: string | null = null;
    try {
      const history = s?.earningsHistory?.history ?? [];
      if (history.length > 0) {
        const latest = history[history.length - 1];
        latestEpsActual = latest.epsActual ?? null;
        latestEpsPeriod = latest.quarter
          ? new Date(latest.quarter as Date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
          : null;
      }
    } catch {}

    return NextResponse.json({
      ticker,
      name: q.longName ?? q.shortName ?? ticker,
      price,
      changePct: q.regularMarketChangePercent ?? null,
      trailingPE: q.trailingPE ?? s?.summaryDetail?.trailingPE ?? null,
      forwardPE: q.forwardPE ?? null,           // NTM forward PE
      fwdPE2026,                                 // current-year EPS estimate PE
      fwdPE2028,                                 // null — not available from Yahoo free data
      trailingEps: q.epsTrailingTwelveMonths ?? null,
      forwardEps: q.epsForward ?? null,
      latestEpsActual,
      latestEpsPeriod,
      nextEarnings,
      marketCap: q.marketCap ?? null,
      sector: q.sector ?? null,
      fiftyTwoWeekHigh: q.fiftyTwoWeekHigh ?? null,
      fiftyTwoWeekLow: q.fiftyTwoWeekLow ?? null,
      news: news.slice(0, 5).map((n: any) => ({
        title: n.title,
        url: n.link,
        source: n.publisher,
        time: n.providerPublishTime
          ? new Date(n.providerPublishTime * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          : null,
      })),
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message ?? 'Unknown error' }, { status: 500 });
  }
}
