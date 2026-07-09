/**
 * SRL Diamond Logo — exact replica of the Sahil Road Lines physical memo logo.
 * Three diamonds: S (top-center), R (bottom-left), L (bottom-right).
 * Each diamond has a double-line border (outer + inner inset).
 * Navy blue (#1a2e5e) on white background.
 */
export function SrlLogo({
  size = 80,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  // The overall viewBox is 120 x 110 to fit the three overlapping diamonds
  // S diamond: centre at (60, 30)  — top
  // R diamond: centre at (32, 68)  — bottom-left
  // L diamond: centre at (88, 68)  — bottom-right
  // Each diamond: half-width=26, half-height=32
  const NAVY = "#1a2e5e";
  const SW_OUTER = 2.5;   // outer border stroke width
  const SW_INNER = 1.2;   // inner inset border stroke width
  const INSET = 5;         // inset distance for inner diamond border

  // Generate the 4 corner points of a rotated-square (diamond)
  const diamond = (cx: number, cy: number, hw: number, hh: number) =>
    `${cx},${cy - hh} ${cx + hw},${cy} ${cx},${cy + hh} ${cx - hw},${cy}`;

  // Inner (inset) diamond points
  const diamondInner = (cx: number, cy: number, hw: number, hh: number) =>
    `${cx},${cy - hh + INSET} ${cx + hw - INSET},${cy} ${cx},${cy + hh - INSET} ${cx - hw + INSET},${cy}`;

  const diamonds = [
    { cx: 60, cy: 30, letter: "S", fontSize: 14 },
    { cx: 32, cy: 68, letter: "R", fontSize: 14 },
    { cx: 88, cy: 68, letter: "L", fontSize: 14 },
  ];
  const hw = 26, hh = 32;

  return (
    <svg
      width={size}
      height={size * (110 / 120)}
      viewBox="0 0 120 110"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="SRL Sahil Road Lines Logo"
      role="img"
    >
      {diamonds.map(({ cx, cy, letter, fontSize }) => (
        <g key={letter}>
          {/* White fill so overlapping areas stay clean */}
          <polygon
            points={diamond(cx, cy, hw, hh)}
            fill="white"
          />
          {/* Outer border */}
          <polygon
            points={diamond(cx, cy, hw, hh)}
            stroke={NAVY}
            strokeWidth={SW_OUTER}
            fill="none"
          />
          {/* Inner inset border */}
          <polygon
            points={diamondInner(cx, cy, hw, hh)}
            stroke={NAVY}
            strokeWidth={SW_INNER}
            fill="none"
          />
          {/* Letter */}
          <text
            x={cx}
            y={cy + 1}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={fontSize}
            fontWeight="700"
            fontFamily="Arial, sans-serif"
            fill={NAVY}
          >
            {letter}
          </text>
        </g>
      ))}
    </svg>
  );
}

