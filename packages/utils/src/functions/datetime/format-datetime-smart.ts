export const formatDateTimeSmart = (
  datetime: Date | string,
  options?: Intl.DateTimeFormatOptions,
) => {
  const date = new Date(datetime);
  const now = new Date();

  return new Date(datetime).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    // if date is in previous year, show year
    // else, hide year, show time
    ...(date.getUTCFullYear() !== now.getUTCFullYear()
      ? { year: "numeric" }
      : {
          hour: "numeric",
          minute: "numeric",
          hour12: true,
        }),
    ...options,
  });
};
