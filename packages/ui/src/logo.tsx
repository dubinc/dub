import { cn } from "@dub/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <svg
      width="64"
      height="64"
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-10 w-10 text-black dark:text-white", className)}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M32 64C49.6731 64 64 49.6731 64 32C64 20.1555 57.5648 9.81398 48 4.28103V31.9999V47.9999H40V45.8594C37.6466 47.2208 34.9143 47.9999 32 47.9999C23.1634 47.9999 16 40.8365 16 31.9999C16 23.1634 23.1634 15.9999 32 15.9999C34.9143 15.9999 37.6466 16.7791 40 18.1404V1.00814C37.443 0.350024 34.7624 0 32 0C14.3269 0 0 14.3269 0 32C0 49.6731 14.3269 64 32 64Z"
        fill="currentColor"
      />
    </svg>
  );
}
