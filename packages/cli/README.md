# `dub-cli`

A CLI for easily shortening URLs with the [Dub.co API](https://dub.co/api).

## Running Locally for Development

1. Clone the repository, install dependencies and navigate to the cli folder:
   ```bash
   cd packages/cli
   ```
2. Build the package in watch mode:
   ```bash
   pnpm dev
   ```
3. In a separate terminal, run commands:
   ```bash
   pnpm start [command]
   ```
4. See all available commands and options:
   ```bash
   pnpm start help
   ```

## Testing Production-like Setup

> **Warning**
> If you have previously installed `dub-cli` globally, uninstall it first to avoid conflicts

1. Build the package:
   ```bash
   pnpm build
   ```
2. Link the package globally:
   ```bash
    npm link
   ```
3. Verify the installation:
   ```bash
    dub -v
   ```
4. Run commands:
   ```bash
   dub [command]
   ```
