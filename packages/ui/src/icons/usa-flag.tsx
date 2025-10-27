"use client";

export function USAFlag({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="USA Flag"
    >
      <path
        d="M32 2C18.7 2 8 12.7 8 26c0 13.3 24 36 24 36s24-22.7 24-36C56 12.7 45.3 2 32 2z"
        fill="#F44336"
      />
      <rect x="8" y="12" width="48" height="3.5" fill="#fff" />
      <rect x="8" y="19" width="48" height="3.5" fill="#fff" />
      <rect x="8" y="26" width="48" height="3.5" fill="#fff" />
      <rect x="8" y="33" width="48" height="3.5" fill="#fff" />
      <rect x="8" y="40" width="48" height="3.5" fill="#fff" />
      <rect x="8" y="47" width="48" height="3.5" fill="#fff" />
      <rect x="8" y="2" width="20" height="20" fill="#1E40AF" />
      <circle cx="12" cy="6" r="0.8" fill="#fff" />
      <circle cx="16" cy="6" r="0.8" fill="#fff" />
      <circle cx="20" cy="6" r="0.8" fill="#fff" />
      <circle cx="24" cy="6" r="0.8" fill="#fff" />
      <circle cx="14" cy="9" r="0.8" fill="#fff" />
      <circle cx="18" cy="9" r="0.8" fill="#fff" />
      <circle cx="22" cy="9" r="0.8" fill="#fff" />
      <circle cx="12" cy="12" r="0.8" fill="#fff" />
      <circle cx="16" cy="12" r="0.8" fill="#fff" />
      <circle cx="20" cy="12" r="0.8" fill="#fff" />
      <circle cx="24" cy="12" r="0.8" fill="#fff" />
      <circle cx="14" cy="15" r="0.8" fill="#fff" />
      <circle cx="18" cy="15" r="0.8" fill="#fff" />
      <circle cx="22" cy="15" r="0.8" fill="#fff" />
      <circle cx="12" cy="18" r="0.8" fill="#fff" />
      <circle cx="16" cy="18" r="0.8" fill="#fff" />
      <circle cx="20" cy="18" r="0.8" fill="#fff" />
      <circle cx="24" cy="18" r="0.8" fill="#fff" />
    </svg>
  );
}
