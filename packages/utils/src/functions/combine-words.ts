export const combineWords = (words: string[]) => {
  return (
    words
      .join(", ")
      // final one should be "and" instead of comma
      .replace(/, ([^,]*)$/, " and $1")
  );
};
