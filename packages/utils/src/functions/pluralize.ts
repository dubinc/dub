export const pluralize = (
  word: string,
  count: number,
  options: {
    plural?: string;
  } = {},
) => {
  if (count === 1) {
    return word;
  }

  // Use custom plural form if provided, otherwise add 's'
  return options.plural || `${word}s`;
};
