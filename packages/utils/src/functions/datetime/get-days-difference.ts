// Function to get the number of days between two dates
export const getDaysDifference = (
  startDate: Date | string,
  endDate: Date | string,
) => {
  startDate = new Date(startDate);
  endDate = new Date(endDate);
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};
