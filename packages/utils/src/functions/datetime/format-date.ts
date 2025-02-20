export const formatDate = (
  datetime: Date | string,
  options?: Intl.DateTimeFormatOptions,
) => {
  if (datetime.toString() === "Invalid Date") return "";
  return new Date(datetime).toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
    ...options,
  });
};
