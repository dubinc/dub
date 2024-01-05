export default function XCircleFill({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width="24"
      height="24"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      shapeRendering="geometricPrecision"
    >
      <circle cx="12" cy="12" r="10" fill="currentColor" />
      <path d="M15 9l-6 6" stroke="white" />
      <path d="M9 9l6 6" stroke="white" />
    </svg>
  );
}
