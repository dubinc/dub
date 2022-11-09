export default function Divider({ className }: { className: string }) {
  return (
    <svg
      fill="none"
      shapeRendering="geometricPrecision"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1"
      viewBox="0 0 24 24"
      width="14"
      height="14"
      className={className}
    >
      <path d="M16.88 3.549L7.12 20.451" />
    </svg>
  );
}
