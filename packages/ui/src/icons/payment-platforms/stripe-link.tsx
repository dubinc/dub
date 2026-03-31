export function StripeLink({ className }: { className?: string }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M12 24C18.6274 24 24 18.6274 24 12C24 5.37257 18.6274 0 12 0C5.37259 0 0 5.37257 0 12C0 18.6274 5.37259 24 12 24Z"
        fill="#00D66F"
      />
      <path
        d="M11.4479 4.80005H7.74707C8.46707 7.80965 10.5695 10.3824 13.1999 12C10.5647 13.6176 8.46707 16.1904 7.74707 19.2H11.4479C12.3647 16.416 14.9039 13.9968 18.0239 13.5024V10.4929C14.8991 10.0033 12.3599 7.58405 11.4479 4.80005Z"
        fill="#011E0F"
      />
    </svg>
  );
}
