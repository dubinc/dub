export const formatDateSmart = (
  datetime: Date | string,
  options?: Intl.DateTimeFormatOptions,
) => {
  const date = new Date(datetime);
  const now = new Date();

  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    // if date is in previous year, show year
    // else, hide year
    ...(date.getUTCFullYear() !== now.getUTCFullYear()
      ? { year: "numeric" }
      : {}),
    ...options,
  });
};
