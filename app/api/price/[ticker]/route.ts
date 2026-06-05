import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const API_KEY = process.env.FINNHUB_API_KEY ?? '';
const BASE = 'https://finnhub.io/api/v1';

export async function GET(
  _req: NextRequest,
  { params }: { params: { ticker: string } }
) {
  const ticker = params.ticker.toUpperCase().trim();
  if (!API_KEY) return NextResponse.json({ error: 'No API key' }, { status: 500 });

  try {
    const res = await fetch(`${BASE}/quote?symbol=${ticker}&token=${API_KEY}`, {
      next: { revalidate: 60 },
    });
    const q = await res.json();
    if (!q.c) return NextResponse.json({ price: null, changePct: null });

    const changePct = q.pc ? ((q.c - q.pc) / q.pc) * 100 : 0;
    return NextResponse.json({
      price: parseFloat(q.c.toFixed(2)),
      changePct: parseFloat(changePct.toFixed(2)),
    });
  } catch {
    return NextResponse.json({ price: null, changePct: null });
  }
}
