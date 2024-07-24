export function LoadingDots() {
  return (
    <span className="inline-flex items-center">
      {[...Array(3)].map((_, i) => (
        <span
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
          className="animate-blink"
        />
      ))}
    </span>
  );
}
