'use client';

import { useState, useEffect, useCallback } from 'react';

interface NewsItem {
  title: string;
  url: string;
  source: string;
  time: string | null;
}

interface StockData {
  ticker: string;
  name: string;
  price: number | null;
  changePct: number | null;
  trailingPE: number | null;
  forwardPE: number | null;
  fwdPE2026: number | null;
  fwdPE2028: number | null;
  trailingEps: number | null;
  forwardEps: number | null;
  latestEpsActual: number | null;
  latestEpsPeriod: string | null;
  nextEarnings: string | null;
  marketCap: number | null;
  sector: string | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  news: NewsItem[];
}

interface CardPrice {
  price: number | null;
  changePct: number | null;
  loading: boolean;
}

const fmt = (n: number | null, decimals = 2) =>
  n == null ? '—' : n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

const fmtPE = (n: number | null) => (n == null ? '—' : n.toFixed(1) + 'x');

const fmtCap = (n: number | null) => {
  if (n == null) return '—';
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  return `$${(n / 1e6).toFixed(0)}M`;
};

const DEFAULT_TICKERS = ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN'];

// ─── Metric tile ──────────────────────────────────────────────────────────────
function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl p-3" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
      <p className="text-xs mb-1" style={{ color: 'var(--muted)' }}>{label}</p>
      <p className="font-semibold text-sm">{value}</p>
    </div>
  );
}

// ─── Stock Detail Modal ────────────────────────────────────────────────────────
function StockModal({ data, onClose }: { data: StockData; onClose: () => void }) {
  const up = (data.changePct ?? 0) >= 0;

  // Lock body scroll while modal open
  useEffect(() => {
    document.body.classList.add('modal-open');
    return () => document.body.classList.remove('modal-open');
  }, []);

  const metrics = [
    { label: 'Trailing P/E', value: fmtPE(data.trailingPE) },
    { label: 'Fwd P/E (NTM)', value: fmtPE(data.forwardPE) },
    { label: 'Fwd P/E 2026', value: fmtPE(data.fwdPE2026) },
    { label: 'Fwd P/E 2028', value: fmtPE(data.fwdPE2028) },
    { label: 'EPS (TTM)', value: data.trailingEps != null ? `$${fmt(data.trailingEps)}` : '—' },
    { label: 'Fwd EPS', value: data.forwardEps != null ? `$${fmt(data.forwardEps)}` : '—' },
    { label: 'Market Cap', value: fmtCap(data.marketCap) },
    { label: '52W High', value: data.fiftyTwoWeekHigh != null ? `$${fmt(data.fiftyTwoWeekHigh)}` : '—' },
    { label: '52W Low', value: data.fiftyTwoWeekLow != null ? `$${fmt(data.fiftyTwoWeekLow)}` : '—' },
  ];

  return (
    /* Full-screen overlay */
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Sheet — slides up on mobile, centered on desktop */}
      <div
        className="w-full sm:max-w-2xl overflow-y-auto rounded-t-3xl sm:rounded-2xl p-5 sm:p-6"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--orange)',
          maxHeight: '92dvh',
          paddingBottom: `calc(1.25rem + env(safe-area-inset-bottom))`,
        }}
      >
        {/* Drag handle (mobile) */}
        <div className="flex justify-center mb-4 sm:hidden">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border)' }} />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-2xl font-bold">{data.ticker}</span>
              {data.sector && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--orange-glow)', color: 'var(--orange)', border: '1px solid var(--orange)' }}>
                  {data.sector}
                </span>
              )}
            </div>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>{data.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-2xl leading-none w-9 h-9 flex items-center justify-center rounded-full transition-opacity hover:opacity-60"
            style={{ color: 'var(--muted)', background: 'var(--border)', flexShrink: 0 }}
          >
            ×
          </button>
        </div>

        {/* Price */}
        <div className="flex items-end gap-3 mb-5">
          <span className="text-4xl font-bold">${fmt(data.price)}</span>
          <span className="text-lg font-semibold mb-0.5" style={{ color: up ? 'var(--green)' : 'var(--red)' }}>
            {up ? '▲' : '▼'} {up ? '+' : ''}{fmt(data.changePct, 2)}%
          </span>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 mb-5">
          {metrics.map((m) => <Tile key={m.label} {...m} />)}
        </div>

        {/* Earnings */}
        <div className="rounded-xl p-4 mb-5" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--orange)' }}>Earnings</p>
          <div className="flex gap-8 flex-wrap">
            <div>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>
                Latest EPS{data.latestEpsPeriod ? ` (${data.latestEpsPeriod})` : ''}
              </p>
              <p className="font-semibold mt-0.5 text-lg">
                {data.latestEpsActual != null ? `$${fmt(data.latestEpsActual)}` : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>Next Earnings Date</p>
              <p className="font-semibold mt-0.5 text-lg">{data.nextEarnings ?? '—'}</p>
            </div>
          </div>
        </div>

        {/* News */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--orange)' }}>Latest News</p>
          {data.news.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--muted)' }}>No news available.</p>
          ) : (
            <ul className="space-y-2">
              {data.news.map((n, i) => (
                <li key={i}>
                  <a
                    href={n.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-xl p-3 text-sm active:opacity-70"
                    style={{ background: 'var(--border)' }}
                  >
                    <p className="font-medium leading-snug mb-1">{n.title}</p>
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>
                      {n.source}{n.time ? ` · ${n.time}` : ''}
                    </p>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Ticker Card ──────────────────────────────────────────────────────────────
function TickerCard({ ticker, cardPrice, onRemove, onClick }: {
  ticker: string;
  cardPrice: CardPrice;
  onRemove: () => void;
  onClick: () => void;
}) {
  const up = (cardPrice.changePct ?? 0) >= 0;

  return (
    <div
      onClick={onClick}
      className="relative group cursor-pointer rounded-2xl p-4 active:scale-95 transition-transform duration-100"
      style={{
        background: 'linear-gradient(135deg, var(--orange) 0%, var(--orange-dark) 100%)',
        boxShadow: '0 4px 20px var(--orange-glow)',
        minHeight: 100,
      }}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full text-sm opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ color: 'rgba(255,255,255,0.9)', background: 'rgba(0,0,0,0.25)' }}
      >
        ×
      </button>

      <p className="text-lg font-bold text-white">{ticker}</p>

      {cardPrice.loading ? (
        <div className="mt-2 space-y-1.5">
          <div className="h-3.5 w-20 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.25)' }} />
          <div className="h-3 w-12 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.15)' }} />
        </div>
      ) : cardPrice.price != null ? (
        <>
          <p className="text-white font-semibold mt-1">${fmt(cardPrice.price)}</p>
          <p className="text-sm font-medium mt-0.5" style={{ color: up ? '#bbf7d0' : '#fecaca' }}>
            {up ? '▲' : '▼'} {up ? '+' : ''}{fmt(cardPrice.changePct, 2)}%
          </p>
        </>
      ) : (
        <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.55)' }}>Tap for details</p>
      )}
    </div>
  );
}

// ─── Loading spinner for modal ────────────────────────────────────────────────
function LoadingModal({ ticker, onClose }: { ticker: string; onClose: () => void }) {
  useEffect(() => {
    document.body.classList.add('modal-open');
    return () => document.body.classList.remove('modal-open');
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl p-10 flex flex-col items-center"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', paddingBottom: `calc(2.5rem + env(safe-area-inset-bottom))` }}
      >
        <div className="w-8 h-8 rounded-full border-2 animate-spin mb-4"
          style={{ borderColor: 'var(--orange)', borderTopColor: 'transparent' }} />
        <p style={{ color: 'var(--muted)' }}>Fetching {ticker}…</p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Home() {
  const [tickers, setTickers] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [cardPrices, setCardPrices] = useState<Record<string, CardPrice>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [stockData, setStockData] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('stock-tickers');
    setTickers(saved ? JSON.parse(saved) : DEFAULT_TICKERS);
  }, []);

  useEffect(() => {
    if (tickers.length === 0) return;
    tickers.forEach((t) => {
      if (cardPrices[t]) return;
      setCardPrices((prev) => ({ ...prev, [t]: { price: null, changePct: null, loading: true } }));
      fetch(`/api/price/${t}`)
        .then((r) => r.json())
        .then((d) => setCardPrices((prev) => ({ ...prev, [t]: { price: d.price, changePct: d.changePct, loading: false } })))
        .catch(() => setCardPrices((prev) => ({ ...prev, [t]: { price: null, changePct: null, loading: false } })));
    });
  }, [tickers]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closeModal(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const saveTickers = (t: string[]) => {
    setTickers(t);
    localStorage.setItem('stock-tickers', JSON.stringify(t));
  };

  const addTicker = () => {
    const t = input.trim().toUpperCase();
    if (!t || tickers.includes(t)) { setInput(''); return; }
    saveTickers([...tickers, t]);
    setInput('');
  };

  const removeTicker = (t: string) => {
    saveTickers(tickers.filter((x) => x !== t));
    setCardPrices((prev) => { const n = { ...prev }; delete n[t]; return n; });
  };

  const openStock = useCallback(async (ticker: string) => {
    setSelected(ticker);
    setStockData(null);
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch(`/api/quote/${ticker}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to fetch');
      setStockData(data);
    } catch (e: any) {
      setFetchError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const closeModal = () => { setSelected(null); setStockData(null); setFetchError(null); };

  return (
    <main
      className="min-h-screen p-4 sm:p-10 max-w-5xl mx-auto"
      style={{ paddingTop: `max(1rem, env(safe-area-inset-top))` }}
    >
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold mb-1">
          Stock <span style={{ color: 'var(--orange)' }}>Tracker</span>
        </h1>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>Tap any ticker for today's full update</p>
      </div>

      {/* Add ticker */}
      <div className="flex gap-2 mb-6">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && addTicker()}
          placeholder="Add ticker (e.g. TSLA)"
          maxLength={10}
          className="flex-1 rounded-xl px-4 py-3 outline-none"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
        />
        <button
          onClick={addTicker}
          className="px-5 py-3 rounded-xl text-sm font-semibold active:opacity-70"
          style={{ background: 'var(--orange)', color: '#fff', minWidth: 64 }}
        >
          Add
        </button>
      </div>

      {/* Ticker grid */}
      {tickers.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--muted)' }}>No tickers yet. Add one above.</p>
      ) : (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {tickers.map((t) => (
            <TickerCard
              key={t}
              ticker={t}
              cardPrice={cardPrices[t] ?? { price: null, changePct: null, loading: true }}
              onRemove={() => removeTicker(t)}
              onClick={() => openStock(t)}
            />
          ))}
        </div>
      )}

      {/* Modal states */}
      {selected && loading && <LoadingModal ticker={selected} onClose={closeModal} />}

      {selected && fetchError && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)' }}
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div
            className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl p-8 text-center"
            style={{ background: 'var(--surface)', paddingBottom: `calc(2rem + env(safe-area-inset-bottom))` }}
          >
            <p className="text-red-400 mb-4">{fetchError}</p>
            <button onClick={closeModal} className="text-sm underline" style={{ color: 'var(--muted)' }}>Close</button>
          </div>
        </div>
      )}

      {selected && !loading && !fetchError && stockData && (
        <StockModal data={stockData} onClose={closeModal} />
      )}
    </main>
  );
}
