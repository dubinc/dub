export const measureTextWidth = (text: string, font = "30px Inter"): number => {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  ctx.font = font;
  return ctx.measureText(text).width;
};
