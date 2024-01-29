export default function Tick({ className }: { className: string }): JSX.Element {
  return (
    <svg
      className={className}
      fill="none"
      height="14"
      shapeRendering="geometricPrecision"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      viewBox="0 0 24 24"
      width="14"
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}
