export const formatDateTime = (
  datetime: Date | string,
  options?: Intl.DateTimeFormatOptions,
) => {
  if (datetime.toString() === "Invalid Date") return "";
  return new Date(datetime).toLocaleTimeString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: true,
    ...options,
  });
};
