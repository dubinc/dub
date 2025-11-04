export const validateFeedback = (text: string): string => {
  const trimmed = text.trim();

  if (!trimmed) {
    return "Please provide details about your cancellation reason";
  }

  if (trimmed.length < 10 || /(.)\1{2,}/.test(trimmed)) {
    return trimmed.length < 10
      ? "Please provide at least 10 characters"
      : "Please provide a valid cancellation reason";
  }

  return "";
};
