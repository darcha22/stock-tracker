import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Stock Tracker';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#0f0f11',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          padding: '60px',
        }}
      >
        {/* Glow blob */}
        <div style={{
          position: 'absolute',
          top: -100,
          left: -100,
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(217,119,87,0.18) 0%, transparent 70%)',
          display: 'flex',
        }} />

        {/* Ticker cards row */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 56 }}>
          {['NVDA', 'AAPL', 'MSFT', 'AMZN'].map((t, i) => (
            <div
              key={t}
              style={{
                background: 'linear-gradient(135deg, #D97757, #b85e3f)',
                borderRadius: 20,
                padding: '20px 28px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                opacity: i === 0 ? 1 : i === 1 ? 0.9 : i === 2 ? 0.75 : 0.55,
              }}
            >
              <span style={{ color: 'white', fontSize: 28, fontWeight: 700 }}>{t}</span>
              <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 16, marginTop: 4 }}>
                {['$131.40', '$211.18', '$452.03', '$205.74'][i]}
              </span>
              <span style={{ color: ['#bbf7d0', '#fecaca', '#bbf7d0', '#fecaca'][i], fontSize: 14, marginTop: 2 }}>
                {['+2.14%', '-0.83%', '+1.20%', '-0.44%'][i]}
              </span>
            </div>
          ))}
        </div>

        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 20 }}>
          <span style={{ color: '#fafafa', fontSize: 72, fontWeight: 800, letterSpacing: -2 }}>Stock</span>
          <span style={{ color: '#D97757', fontSize: 72, fontWeight: 800, letterSpacing: -2 }}>Tracker</span>
        </div>

        {/* Subtitle */}
        <p style={{ color: '#71717a', fontSize: 26, textAlign: 'center', maxWidth: 700, margin: 0 }}>
          Live prices · PE ratios · Earnings dates · Top news
        </p>
      </div>
    ),
    { ...size }
  );
}
