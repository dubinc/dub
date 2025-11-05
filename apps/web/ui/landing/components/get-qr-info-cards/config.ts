export const GET_QR_CARDS = [
  {
    title: "Select Your QR Code Type",
    content:
      "Choose what you want to share—whether it's a website, PDF, video, social media, business card, or more.",
    cursorText: "Choose Type",
    visualType: "selection" as const,
  },
  {
    title: "Customize Your QR Code",
    content:
      "Add your details, change colors, add a logo, and use our design tools to make it uniquely yours.",
    cursorText: "Customize",
    visualType: "customization" as const,
  },
  {
    title: "Download & Share",
    content:
      "Save your QR code in high-quality formats (PNG, SVG, JPEG) and use it anywhere—print, display, or share digitally!",
    cursorText: "Download",
    visualType: "download" as const,
  },
];
