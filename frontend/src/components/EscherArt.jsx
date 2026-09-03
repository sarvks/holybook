// Escher-inspired geometric line art for section headers (CSS/SVG only, no imagery).
export function EscherArt({ className = "", variant = "lattice" }) {
  const stroke = "var(--gold)";
  if (variant === "tessellation") {
    return (
      <svg className={className} viewBox="0 0 240 60" fill="none" aria-hidden="true">
        {Array.from({ length: 12 }).map((_, i) => (
          <path key={i} d={`M${i * 20} 0 L${i * 20 + 10} 30 L${i * 20} 60 M${i * 20 + 10} 30 L${i * 20 + 20} 0 M${i * 20 + 10} 30 L${i * 20 + 20} 60`}
            stroke={stroke} strokeWidth="0.6" opacity="0.5" />
        ))}
      </svg>
    );
  }
  if (variant === "stairs") {
    return (
      <svg className={className} viewBox="0 0 120 60" fill="none" aria-hidden="true">
        {Array.from({ length: 6 }).map((_, i) => (
          <rect key={i} x={i * 18} y={48 - i * 8} width="18" height="12" stroke={stroke} strokeWidth="0.6" opacity="0.45" />
        ))}
      </svg>
    );
  }
  return (
    <svg className={className} viewBox="0 0 240 40" fill="none" aria-hidden="true">
      {Array.from({ length: 24 }).map((_, i) => (
        <line key={i} x1={i * 10} y1="0" x2={i * 10 + 40} y2="40" stroke={stroke} strokeWidth="0.5" opacity="0.35" />
      ))}
      {Array.from({ length: 24 }).map((_, i) => (
        <line key={`b${i}`} x1={i * 10} y1="40" x2={i * 10 + 40} y2="0" stroke={stroke} strokeWidth="0.5" opacity="0.2" />
      ))}
    </svg>
  );
}
