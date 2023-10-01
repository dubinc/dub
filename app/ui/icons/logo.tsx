import { cn } from "#/lib/utils";

export default function Logo({ className }: { className?: string }) {
  return (
<svg width="160" height="160" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn("w-10 text-black", className)}>
<path d="M135.026 160C110 160 110 160 110 134.24C110 110 110 110 135.026 110C160 109.995 160 110 160 134.24C160 160 160.051 160 135.026 160Z" fill="#FAA628"/>
<path d="M0 25.0257C0 0 6.35783e-06 0 25.7602 0C49.9999 0 49.9999 0 49.9999 25.0257C50.0051 50 49.9999 50 25.7602 50C0 50 1.35796e-06 50.0514 0 25.0257Z" fill="#0076C5"/>
<path d="M55 80.0257C55 55 55 55 80.7602 55C105 55 105 55 105 80.0257C105.005 105 105 105 80.7602 105C55 105 55 105.051 55 80.0257Z" fill="#8ECEA8"/>
<path d="M110 25.0257C110 0 110 0 135.76 0C160 0 160 0 160 25.0257C160.005 50 160 50 135.76 50C110 50 110 50.0514 110 25.0257Z" fill="#292E34"/>
<rect x="110" y="110" width="50" height="26" fill="#FAA628"/>
<rect x="55" width="50" height="50" fill="#F6CE55"/>
<rect x="110" y="55" width="50" height="50" rx="25" fill="#5D5FEF"/>
<rect y="55" width="50" height="50" rx="25" fill="#8ECEA8"/>
<rect y="55" width="50" height="50" rx="25" fill="#EE5495"/>
<rect x="26" width="24" height="50" fill="#8ECEA8"/>
<rect x="26" width="24" height="50" fill="#0076C5"/>
<rect x="26" width="24" height="50" fill="#0076C5"/>
<rect x="26" width="24" height="50" fill="#0076C5"/>
</svg>

  );
}
