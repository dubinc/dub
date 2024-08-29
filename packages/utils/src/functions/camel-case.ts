// From snake_case to camelCase
export const toCamelCase = (str: string) => {
  // If already camelCase, return as is
  if (/^[a-z][a-zA-Z0-9]*$/.test(str)) {
    return str;
  }

  // Convert snake_case to camelCase
  return str
    .toLowerCase()
    .replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
};
