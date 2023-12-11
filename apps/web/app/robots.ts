import { MetadataRoute } from "next";

interface CustomRules {
  disallowedPaths: string[];
  allowedPaths: string[];
  sitemap: string;
}

// Generate dynamic rules based on user-defined inputs
export function generateRobotsTxt(customRules: CustomRules): MetadataRoute.Robots {
  const { disallowedPaths, allowedPaths, sitemap } = customRules;

  const disallowRules = disallowedPaths.map(path => `Disallow: ${path}`).join('\n');
  const allowRules = allowedPaths.map(path => `Allow: ${path}`).join('\n');

  return {
    rules: {
      userAgent: '*',
      disallow: disallowRules,
      allow: allowRules,
    },
    sitemap,
  };
}

// Final function to generate the robots.txt file
export default function robots(): MetadataRoute.Robots {
  // Placeholder data
  const userInput: CustomRules = {
    disallowedPaths: ['/admin/', '/private/'],
    allowedPaths: ['/public/'],
    sitemap: 'https://example.com/sitemap.xml',
  };

  // Generate robots.txt based on user input
  return generateRobotsTxt(userInput);
}
