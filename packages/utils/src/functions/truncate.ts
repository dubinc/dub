export const truncate = (str: string | null, length: number): string | null => {
  if (!str || str.length <= length) return str;
  return `${str.slice(0, length - 3)}...`;
};
