export const isCookieEnabled = () => {
  if (typeof document !== "undefined") {
    document.cookie = "test_cookie=1;";

    return document.cookie.indexOf("test_cookie=1") !== -1;
  }

  return false;
};
