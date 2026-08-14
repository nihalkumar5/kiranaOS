// Shared Logo component — uniform across all pages
// Usage: <Logo /> | <Logo suffix="POS" /> | <Logo size="lg" />

interface LogoProps {
  suffix?: string;       // e.g. "POS", "Dashboard"
  size?: 'sm' | 'md' | 'lg' | 'xl';
  dark?: boolean;        // true = dark bg (login/register), false = light bg (default)
}

const sizes = {
  sm:  { main: 18, suffix: 14 },
  md:  { main: 22, suffix: 16 },
  lg:  { main: 28, suffix: 20 },
  xl:  { main: 36, suffix: 24 },
};

export default function Logo({ suffix, size = 'md', dark = false }: LogoProps) {
  const s = sizes[size];
  const mainColor = dark ? '#ffffff' : '#0d1b2a';

  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 0, userSelect: 'none' }}>
      <span style={{
        fontSize: s.main,
        fontWeight: 900,
        letterSpacing: '-0.03em',
        color: mainColor,
        fontFamily: 'Inter, system-ui, sans-serif',
      }}>
        Kirana
      </span>
      <span style={{
        fontSize: s.main,
        fontWeight: 900,
        letterSpacing: '-0.03em',
        color: '#00c27c',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}>
        OS
      </span>
      {suffix && (
        <span style={{
          fontSize: s.suffix,
          fontWeight: 500,
          color: dark ? 'rgba(255,255,255,0.45)' : '#94a3b8',
          marginLeft: 8,
          letterSpacing: '0.01em',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}>
          {suffix}
        </span>
      )}
    </span>
  );
}
