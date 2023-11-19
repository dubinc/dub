export default function Facebook({
  className,
  fill = "#1977f3",
}: {
  className?: string;
  fill?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1365.12"
      height="1365.12"
      viewBox="0 0 14222 14222"
      className={className}
    >
      <circle cx="7111" cy="7112" r="7111" fill={fill} />
      <path
        d="M9879 9168l315-2056H8222V5778c0-562 275-1111 1159-1111h897V2917s-814-139-1592-139c-1624 0-2686 984-2686 2767v1567H4194v2056h1806v4969c362 57 733 86 1111 86s749-30 1111-86V9168z"
        fill="#fff"
      />
    </svg>
  );
}
