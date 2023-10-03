import { cn } from "#/lib/utils";

export default function Logo({ className }: { className?: string }) {
  return (
    <svg
      width="180"
      height="180"
      viewBox="0 0 180 180"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("w-10 text-black", className)}
    >
      <rect width="180" height="180" fill="#1E1E1E" />
      <path d="M0 20V180L180 20H0Z" fill="white" />
      <path d="M0 40V153L127.5 40H0Z" fill="#5D5FEF" />
      <path d="M180 180L180 56L40 180L180 180Z" fill="white" />
      <path d="M180 180L180 82.5L70 180L180 180Z" fill="#F6CE55" />
      <path d="M180 180V119L110.7 180L180 180Z" fill="white" />
      <path d="M180 180V145.2L140.7 180H180Z" fill="#EE5495" />
    </svg>
  );
}
