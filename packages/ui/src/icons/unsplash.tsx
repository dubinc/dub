export default function Unsplash({ className }: { className?: string }): JSX.Element {
  return (
    <svg
      className={className}
      height="32"
      viewBox="0 0 32 32"
      width="32"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M10 9V0h12v9H10zm12 5h10v18H0V14h10v9h12v-9z"
        fill="currentColor"
        fillRule="nonzero"
      />
    </svg>
  );
}
