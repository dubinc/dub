export const useFeedback = () => {
  const leaveFeedback = async () => {
    try {
      await fetch("/api/user", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ hasRated: true }),
      });

      return true;
    } catch (e) {
      return false;
    }
  };

  return {
    leaveFeedback,
  };
};
