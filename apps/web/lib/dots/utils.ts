import { DOTS_API_KEY, DOTS_CLIENT_ID } from "./env";

export const getBasicAuthToken = () => {
  return Buffer.from(`${DOTS_CLIENT_ID}:${DOTS_API_KEY}`).toString("base64");
};

export const dotsHeaders = ({ dotsAppId }: { dotsAppId?: string } = {}) => {
  return {
    Authorization: `Basic ${getBasicAuthToken()}`,
    "Content-Type": "application/json",
    ...(dotsAppId ? { "Api-App-Id": dotsAppId } : {}),
  };
};

export const dotsFlowConfigurations = encodeURIComponent(
  JSON.stringify({
    theme: "light",
    variables: {
      backgroundColor: "#ffffff",
      primaryTextColor: "#000000",
      secondaryTextColor: "#757575",
      primaryColor: "#000000",
      tabBackgroundColor: "#ffffff",
      tabHoverBackgroundColor: "#fafafa",
      tabBorderColor: "#d4d4d4",
      tabHoverBorderColor: "#d4d4d4",
      buttonBackgroundColor: "#000000",
      buttonTextColor: "#ffffff",
      buttonHoverTextColor: "#ffffff",
      buttonHoverBackgroundColor: "#1F2937",
      buttonDisabledBackgroundColor: "#f1f3f4",
      buttonDisabledTextColor: "#9a9ba2",
      inputBackgroundColor: "#ffffff",
      inputBorderColor: "#d4d4d4",
      inputPlaceholderColor: "#a3a3a3",
      borderRadius: "8px",
    },
  }),
);
