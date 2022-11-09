export default function SortDesc({ className }: { className: string }) {
  return (
    <svg
      fill="none"
      shapeRendering="geometricPrecision"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      viewBox="0 0 24 24"
      width="24"
      height="24"
      className={className}
    >
      <path d="M11 5h10"></path>
      <path d="M11 9h7"></path>
      <path d="M11 13h4"></path>
      <path d="m3 17 3 3 3-3"></path>
      <path d="M6 18V4"></path>
    </svg>
  );
}
