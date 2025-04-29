// Helper function to check if an IP is in a CIDR range
export const isIpInRange = (ip: string, cidr: string): boolean => {
  const [rangeIp, prefix] = cidr.split("/");
  const prefixLength = parseInt(prefix);

  // Convert IPs to binary
  const ipToBinary = (ip: string) => {
    return ip
      .split(".")
      .map((octet) => parseInt(octet).toString(2).padStart(8, "0"))
      .join("");
  };

  const ipBinary = ipToBinary(ip);
  const rangeBinary = ipToBinary(rangeIp);

  // Compare the network portions
  return ipBinary.slice(0, prefixLength) === rangeBinary.slice(0, prefixLength);
};
