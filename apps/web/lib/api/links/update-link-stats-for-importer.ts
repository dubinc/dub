export const updateLinkStatsForImporter = ({
  currentTimestamp,
  newTimestamp,
}: {
  currentTimestamp: Date | null;
  newTimestamp: Date;
}) => {
  // if there is no existing timestamp, return the new timestamp
  if (!currentTimestamp) {
    return newTimestamp;
  }

  // if the new timestamp is greater than the existing timestamp, return the new timestamp
  if (newTimestamp > currentTimestamp) {
    return newTimestamp;
  }

  // if the new timestamp is less than the existing timestamp, return undefined (no update needed)
  return undefined;
};
