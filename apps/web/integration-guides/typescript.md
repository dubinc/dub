## Installation

Install the Dub TypeScript SDK using your package manager of choice:

```bash npm
npm install dub
```

```bash pnpm
pnpm add dub
```

```bash yarn
# zod is a peer dependency
yarn add dub zod
```

## Basic Usage

Here's how you can use the Dub TypeScript SDK:

```typescript
import { Dub } from "dub";

// Initialize the Dub SDK with your API key
const dub = new Dub({
  token: process.env.DUB_API_KEY, // optional, defaults to DUB_API_KEY
});
```

Additional resources:

1. [NPM Package](https://d.to/ts/sdk)
2. [SDK Reference](https://github.com/dubinc/dub-ts/blob/main/README.md)
3. [Examples](https://github.com/dubinc/examples/tree/main/typescript)
