# `@dub/ui`

`@dub/ui` is a library of React components that are used across Dub.co's web applications.

## Installation

To install the package, run:

```bash
pnpm i @dub/ui
```

### Transpiling

As of version `0.1.0` the package is not bundled, this means transpiling the module is 
highly recommended, this was done to support React Server Components.

If you are using NextJS this is as simple as:

```js
// next.config.js
/** @type {import('next').NextConfig} */
module.exports = {
  transpilePackages: ["@dub/ui"]
}
```