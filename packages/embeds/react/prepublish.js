const fs = require("fs");
const path = require("path");

const pkgPath = path.resolve(__dirname, "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));

const packageDirMap = {
  "@dub/embed-core": "../core",
};

const depType = "dependencies";

if (pkg[depType]) {
  for (const dep in pkg[depType]) {
    if (pkg[depType][dep] === "workspace:*") {
      // Resolve the local package's path
      const depPath =
        packageDirMap[dep] || path.join("..", dep.replace("@dub/", ""));
      const depPkgPath = path.resolve(__dirname, depPath, "package.json");

      try {
        const depPkg = JSON.parse(fs.readFileSync(depPkgPath, "utf-8"));
        const version = `^${depPkg.version}`;
        pkg[depType][dep] = version;
      } catch (e) {
        process.exit(1);
      }
    }
  }
}

// Write the updated package.json
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));

console.log("✅ Dependencies patched for publish.");
