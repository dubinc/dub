export const convertSvgUrlToBase64 = async (url: string): Promise<string> => {
  const response = await fetch(url);
  const svgText = await response.text();
  console.log("svgText", svgText);
  console.log("url", url);
  return `data:image/svg+xml;base64,${btoa(svgText)}`;
};
