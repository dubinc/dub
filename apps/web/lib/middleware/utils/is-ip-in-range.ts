// Helper function to check if an IP is in a CIDR range
export const isIpInRange = (ip: string, cidr: string): boolean => {
  // Validate CIDR format
  const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
  if (!cidrRegex.test(cidr)) {
    return false;
  }

  const [rangeIp, prefix] = cidr.split("/");
  const prefixLength = parseInt(prefix);

  // Validate prefix length
  if (prefixLength < 0 || prefixLength > 32) {
    return false;
  }

  // Validate IP format
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipRegex.test(ip)) {
    return false;
  }

  // Convert IPs to binary
  const ipToBinary = (ip: string) => {
    return ip
      .split(".")
      .map((octet) => {
        const num = parseInt(octet);
        // Validate octet range
        if (num < 0 || num > 255) {
          throw new Error("Invalid IP octet");
        }
        return num.toString(2).padStart(8, "0");
      })
      .join("");
  };

  try {
    const ipBinary = ipToBinary(ip);
    const rangeBinary = ipToBinary(rangeIp);

    // Compare the network portions
    return (
      ipBinary.slice(0, prefixLength) === rangeBinary.slice(0, prefixLength)
    );
  } catch {
    return false;
  }
};
