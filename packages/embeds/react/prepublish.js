const fs = require("fs");
const path = require("path");

const pkgPath = path.resolve(__dirname, "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));

// Replace all "workspace:*" with actual versions
for (const depType of ["dependencies", "peerDependencies", "devDependencies"]) {
  if (!pkg[depType]) continue;

  for (const dep in pkg[depType]) {
    if (pkg[depType][dep] === "workspace:*") {
      // Find the package.json of the dependency
      const depPkgPath = path.resolve(__dirname, "..", dep, "package.json");
      const depPkg = JSON.parse(fs.readFileSync(depPkgPath, "utf-8"));
      pkg[depType][dep] = `^${depPkg.version}`;
    }
  }
}

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
