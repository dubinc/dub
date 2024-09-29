export const detectQr = (req: Request) => {
  const searchParams = new URLSearchParams(req.url);
  if (searchParams.get("qr") === "1") return true;
  return false;
};
