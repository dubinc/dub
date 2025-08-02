// Helper function to destructure email into username and domain
export const destructureEmail = (email: string) => {
  const [username, domain] = email.toLowerCase().split("@");

  return {
    username: username || "",
    domain: domain || "",
  };
};
