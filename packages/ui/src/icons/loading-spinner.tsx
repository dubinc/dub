import { cn } from "@dub/utils";

export default function LoadingSpinner({ className }: { className?: string }): JSX.Element {
  return (
    <div className={cn("h-5 w-5", className)}>
      <div
        className={cn("loading-spinner", "h-5 w-5", className)}
        style={{
          position: "relative",
          top: "50%",
          left: "50%",
        }}
      >
        {[...Array(12)].map((_, i) => (
          <div
            className="animate-spinner"
            key={i}
            style={{
              animationDelay: `${-1.2 + 0.1 * i}s`,
              background: "gray",
              position: "absolute",
              borderRadius: "1rem",
              width: "30%",
              height: "8%",
              left: "-10%",
              top: "-4%",
              transform: `rotate(${30 * i}deg) translate(120%)`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
