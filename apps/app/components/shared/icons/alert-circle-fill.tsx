export default function AlertCircleFill({ className }: { className: string }) {
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
      <circle cx="12" cy="12" r="10" fill="currentColor" />
      <path d="M12 8v4" stroke="white" />
      <path d="M12 16h.01" stroke="white" />
    </svg>
  );
}
