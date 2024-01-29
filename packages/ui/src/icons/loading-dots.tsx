export default function LoadingDots(): JSX.Element {
  return (
    <span className="inline-flex items-center">
      {[...Array(3)].map((_, i) => (
        <span
          className="animate-blink"
          key={i}
          style={{
            animationDelay: `${0.2 * i}s`,
            backgroundColor: "black",
            width: "5px",
            height: "5px",
            borderRadius: "50%",
            display: "inline-block",
            margin: "0 1px",
          }}
        />
      ))}
    </span>
  );
}
