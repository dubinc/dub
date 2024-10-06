# `dub-cli`

A CLI for easily shortening URLs with the [Dub.co API](https://dub.co/api).

## Available Commands

| Command                   | Description                                                                                                                                                                                              |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dub login [key]`         | Configure your workspace API key                                                                                                                                                                         |
| `dub config`              | See your configured workspace credentials                                                                                                                                                                |
| `dub domains`             | Configure your workspace domain                                                                                                                                                                          |
| `dub shorten [url] [key]` | Create a short link. You can preemptively pass the URL and the generated short link key, or go through the CLI prompts.                                                                                  |
| `dub links [options]`     | Search for links in your Dub workspace. Available options include: `-s, --search <search>` to search for a link by name, or `-l, --limit <limit>` to limit the number of links returned (default is 10). |
| `dub help [command]`      | Display help for a specific command                                                                                                                                                                      |

## Running Locally for Development

1. Clone the repository, install dependencies and navigate to the `cli` folder:
   ```bash
   cd packages/cli
   ```
2. Build the package in watch mode:
   ```bash
   pnpm dev
   ```
3. In a separate terminal, navigate to the `cli` folder again and run an [available command](#available-commands):
   ```bash
   pnpm start [command]
   ```
4. See all [available commands](#available-commands) and options:
   ```bash
   pnpm start help
   ```

## Testing Production-like Setup

> **Warning**
> If you have previously installed `dub-cli` globally, uninstall it first to avoid conflicts

1. Clone the repository, install dependencies and navigate to the `cli` folder:
   ```bash
   cd packages/cli
   ```
2. Build the package:
   ```bash
   pnpm build
   ```
3. Link the package globally:
   ```bash
    npm link
   ```
4. Verify the installation:
   ```bash
    dub -v
   ```
5. Run commands:
   ```bash
   dub [command]
   ```
