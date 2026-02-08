import fs from "fs";
import path from "path";

// Types and interfaces
interface Dependency {
  name: string;
  version: string;
  size: number;
  formattedSize: string;
}

interface PackageGroup {
  group: string;
  packages: Dependency[];
  totalSize: number;
}

interface PackageJson {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

// Function to get directory size recursively
function getDirectorySize(dirPath: string): number {
  let totalSize = 0;

  try {
    const items = fs.readdirSync(dirPath);

    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stats = fs.statSync(itemPath);

      if (stats.isDirectory()) {
        totalSize += getDirectorySize(itemPath);
      } else {
        totalSize += stats.size;
      }
    }
  } catch (error) {
    // Skip if directory doesn't exist or can't be read
  }

  return totalSize;
}

// Function to format bytes to human readable format
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// Function to get dependencies from package.json
function getDependencies(): Record<string, string> {
  const packageJsonPath = path.join(__dirname, "../package.json");
  const packageJson: PackageJson = JSON.parse(
    fs.readFileSync(packageJsonPath, "utf8"),
  );

  return {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };
}

// Function to analyze dependencies
function analyzeDependencies(): Dependency[] {
  const allDependencies = getDependencies();
  const dependencySizes: Dependency[] = [];
  const nodeModulesPath = path.join(__dirname, "../node_modules");

  for (const [packageName, version] of Object.entries(allDependencies)) {
    const packagePath = path.join(nodeModulesPath, packageName);

    if (fs.existsSync(packagePath)) {
      const size = getDirectorySize(packagePath);
      dependencySizes.push({
        name: packageName,
        version,
        size,
        formattedSize: formatBytes(size),
      });
    }
  }

  // Sort by size (largest first)
  return dependencySizes.sort((a, b) => b.size - a.size);
}

// Function to find duplicate packages
function findDuplicatePackages(dependencySizes: Dependency[]): PackageGroup[] {
  const packageGroups: Record<string, Dependency[]> = {};

  dependencySizes.forEach((dep) => {
    const baseName = dep.name.split("/")[0];
    if (!packageGroups[baseName]) {
      packageGroups[baseName] = [];
    }
    packageGroups[baseName].push(dep);
  });

  return Object.entries(packageGroups)
    .filter(([, packages]) => packages.length > 1)
    .map(([name, packages]) => ({
      group: name,
      packages,
      totalSize: packages.reduce((sum, pkg) => sum + pkg.size, 0),
    }));
}

// Function to print analysis results
function printAnalysis(dependencySizes: Dependency[]): void {
  console.log("🔍 Analyzing bundle size...\n");

  // Print top 20 largest dependencies
  console.log("📦 Top 20 Largest Dependencies:\n");
  console.log("Package Name".padEnd(40) + "Version".padEnd(20) + "Size");
  console.log("-".repeat(80));

  dependencySizes.slice(0, 20).forEach((dep, index) => {
    const rank = (index + 1).toString().padStart(2);
    console.log(
      `${rank}. ${dep.name.padEnd(37)} ${dep.version.padEnd(20)} ${dep.formattedSize}`,
    );
  });

  // Calculate totals
  const totalSize = dependencySizes.reduce((sum, dep) => sum + dep.size, 0);
  const top20Size = dependencySizes
    .slice(0, 20)
    .reduce((sum, dep) => sum + dep.size, 0);

  console.log("\n" + "=".repeat(80));
  console.log(`Total size of all dependencies: ${formatBytes(totalSize)}`);
  console.log(`Top 20 dependencies size: ${formatBytes(top20Size)}`);
  console.log(
    `Top 20 represent ${((top20Size / totalSize) * 100).toFixed(1)}% of total size`,
  );
}

// Function to print optimization opportunities
function printOptimizationOpportunities(dependencySizes: Dependency[]): void {
  console.log("\n🎯 Potential Optimization Opportunities:\n");

  // Find large packages (>1MB)
  const largePackages = dependencySizes.filter((dep) => dep.size > 1024 * 1024);

  // Find duplicate packages
  const duplicatePackages = findDuplicatePackages(dependencySizes);

  if (duplicatePackages.length > 0) {
    console.log("📋 Potential duplicate/similar packages:");
    duplicatePackages.forEach((group) => {
      console.log(`  ${group.group}:`);
      group.packages.forEach((pkg) => {
        console.log(`    - ${pkg.name}@${pkg.version}: ${pkg.formattedSize}`);
      });
      console.log(`    Total: ${formatBytes(group.totalSize)}\n`);
    });
  }

  // Check for very large packages (>5MB)
  const veryLargePackages = dependencySizes.filter(
    (dep) => dep.size > 5 * 1024 * 1024,
  );

  if (veryLargePackages.length > 0) {
    console.log("⚠️  Very large packages (>5MB) - consider alternatives:");
    veryLargePackages.forEach((dep) => {
      console.log(`  - ${dep.name}@${dep.version}: ${dep.formattedSize}`);
    });
  }

  console.log("\n💡 Tips for reducing bundle size:");
  console.log("1. Use dynamic imports for large libraries");
  console.log("2. Consider tree-shaking friendly alternatives");
  console.log("3. Use bundle analyzer to identify unused code");
  console.log("4. Consider code splitting for large components");
  console.log("5. Remove unused dependencies");
}

// Main function
function main(): void {
  try {
    const dependencySizes = analyzeDependencies();
    printAnalysis(dependencySizes);
    printOptimizationOpportunities(dependencySizes);
  } catch (error) {
    console.error("❌ Error analyzing bundle:", error);
    process.exit(1);
  }
}

// Run the analysis
main();
