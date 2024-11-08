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
      tabHoverBackgroundColor: "#f5f5f5",
      tabBorderColor: "#757575",
      tabHoverBorderColor: "#757575",
      buttonBackgroundColor: "#000000",
      buttonTextColor: "#ffffff",
      buttonHoverTextColor: "#ffffff",
      buttonHoverBackgroundColor: "#1F2937",
      inputBackgroundColor: "#ffffff",
      inputBorderColor: "#757575",
      buttonDisabledBackgroundColor: "#f1f3f4",
      buttonDisabledTextColor: "#9a9ba2",
      inputPlaceholderColor: "#9a9ba2",
      borderRadius: "10px",
    },
  }),
);
