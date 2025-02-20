// Function to get the last day of the current month
export const getLastDayOfMonth = () => {
  const today = new Date();
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0); // This will give the last day of the current month
  return lastDay.getDate();
};

// Adjust the billingCycleStart based on the number of days in the current month
export const getAdjustedBillingCycleStart = (billingCycleStart: number) => {
  const lastDay = getLastDayOfMonth();
  if (billingCycleStart > lastDay) {
    return lastDay;
  } else {
    return billingCycleStart;
  }
};

export const getBillingStartDate = (billingCycleStart: number) => {
  const today = new Date();
  const currentDay = today.getDate();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const adjustedBillingCycleStart =
    getAdjustedBillingCycleStart(billingCycleStart);
  if (currentDay <= adjustedBillingCycleStart) {
    // if the current day is less than the billing cycle start, we need to go back a month
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1; // if the current month is January, we need to go back to December
    const lastYear = currentMonth === 0 ? currentYear - 1 : currentYear; // if the current month is January, we need to go back a year
    return new Date(lastYear, lastMonth, adjustedBillingCycleStart);
  } else {
    return new Date(currentYear, currentMonth, adjustedBillingCycleStart);
  }
};
