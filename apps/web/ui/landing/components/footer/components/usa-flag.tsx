export function USAFlag({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="USA Flag"
    >
      <defs>
        <clipPath id="heart-clip">
          <path d="M50,90 C50,90 10,65 10,40 C10,30 15,20 25,20 C32,20 38,24 50,35 C62,24 68,20 75,20 C85,20 90,30 90,40 C90,65 50,90 50,90 Z" />
        </clipPath>
      </defs>

      {/* Heart outline with stripes */}
      <g clipPath="url(#heart-clip)">
        {/* Red stripes background */}
        <rect x="0" y="0" width="100" height="100" fill="#B22234" />

        {/* White stripes */}
        <rect x="0" y="7.7" width="100" height="7.7" fill="#FFFFFF" />
        <rect x="0" y="23.1" width="100" height="7.7" fill="#FFFFFF" />
        <rect x="0" y="38.5" width="100" height="7.7" fill="#FFFFFF" />
        <rect x="0" y="53.8" width="100" height="7.7" fill="#FFFFFF" />
        <rect x="0" y="69.2" width="100" height="7.7" fill="#FFFFFF" />
        <rect x="0" y="84.6" width="100" height="7.7" fill="#FFFFFF" />

        {/* Blue canton */}
        <rect x="0" y="0" width="40" height="46.2" fill="#3C3B6E" />

        {/* Stars */}
        <g fill="#FFFFFF">
          {/* Row 1 */}
          <circle cx="8" cy="6" r="1.2" />
          <circle cx="16" cy="6" r="1.2" />
          <circle cx="24" cy="6" r="1.2" />
          <circle cx="32" cy="6" r="1.2" />

          {/* Row 2 */}
          <circle cx="12" cy="11" r="1.2" />
          <circle cx="20" cy="11" r="1.2" />
          <circle cx="28" cy="11" r="1.2" />

          {/* Row 3 */}
          <circle cx="8" cy="16" r="1.2" />
          <circle cx="16" cy="16" r="1.2" />
          <circle cx="24" cy="16" r="1.2" />
          <circle cx="32" cy="16" r="1.2" />

          {/* Row 4 */}
          <circle cx="12" cy="21" r="1.2" />
          <circle cx="20" cy="21" r="1.2" />
          <circle cx="28" cy="21" r="1.2" />

          {/* Row 5 */}
          <circle cx="8" cy="26" r="1.2" />
          <circle cx="16" cy="26" r="1.2" />
          <circle cx="24" cy="26" r="1.2" />
          <circle cx="32" cy="26" r="1.2" />

          {/* Row 6 */}
          <circle cx="12" cy="31" r="1.2" />
          <circle cx="20" cy="31" r="1.2" />
          <circle cx="28" cy="31" r="1.2" />

          {/* Row 7 */}
          <circle cx="8" cy="36" r="1.2" />
          <circle cx="16" cy="36" r="1.2" />
          <circle cx="24" cy="36" r="1.2" />
          <circle cx="32" cy="36" r="1.2" />

          {/* Row 8 */}
          <circle cx="12" cy="41" r="1.2" />
          <circle cx="20" cy="41" r="1.2" />
          <circle cx="28" cy="41" r="1.2" />
        </g>
      </g>

      {/* Grey border around the heart */}
      <path
        d="M50,90 C50,90 10,65 10,40 C10,30 15,20 25,20 C32,20 38,24 50,35 C62,24 68,20 75,20 C85,20 90,30 90,40 C90,65 50,90 50,90 Z"
        fill="none"
        stroke="#9CA3AF"
        strokeWidth="2"
      />
    </svg>
  );
}
