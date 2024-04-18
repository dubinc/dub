export const detectQr = (req: Request) => {
  const searchParams = new URL(req.url).searchParams;
  if (searchParams.get("qr") === "1") return true;
  return false;
};
