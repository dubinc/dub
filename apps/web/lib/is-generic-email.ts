export const isGenericEmail = (email: string) => {
  return (
    email.endsWith("@gmail.com") ||
    email.endsWith("@yahoo.com") ||
    email.endsWith("@hotmail.com") ||
    email.endsWith("@outlook.com") ||
    email.endsWith("@icloud.com") ||
    email.endsWith("@aol.com") ||
    email.endsWith("@comcast.net") ||
    email.endsWith("@verizon.net") ||
    email.endsWith("@att.net")
  );
};
