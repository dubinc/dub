export default function PlanBadge({ plan }: { plan: string }) {
  let color = "#000";
  if (plan === "enterprise") {
    color = "#7C3AED";
  } else if (plan.startsWith("business")) {
    color = "#0694A2";
  } else if (plan === "pro") {
    color = "#3182CE";
  }

  return (
    <span
      style={{
        padding: "4px 8px",
        borderRadius: "9999px",
        fontSize: "0.75rem",
        textTransform: "capitalize",
        display: "inline-block",
        fontWeight: "500",
        whiteSpace: "nowrap",
        backgroundColor: color,
        color: "#fff",
      }}
    >
      {plan}
    </span>
  );
}
