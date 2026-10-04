---
title: Set up a project
sidebar_label: Set up a project
---

# Set up a project

**Goal:** an empty project that starts the platform. Chapter 0 then adds the first service.

If you only want to run the tutorial's samples, skip to [The samples](./index.md#the-samples). This page is for starting your own project.

## What you need

- **Access to the 3flows repositories on GitHub.** The platform isn't public yet.
- **A GitHub token with `read:packages`.** The platform is published to GitHub Packages as `@3flows/platform`, and GitHub Packages needs a token even to read. Create a personal access token (classic) with the `read:packages` scope.
- **Node.js 24+.** It comes with Corepack, which provides the right Yarn version per project.

```sh
corepack enable
export NPM_REPOSITORY_GH_TOKEN=<your token>   # e.g. in your shell profile
```

## Start from the starter

The samples repository has an empty project, ready to copy:

```sh
git clone https://github.com/3flows/platform-samples.git
cp -r platform-samples/starter appointment-reminders
cd appointment-reminders
```

It contains five files and a `yarn.lock`. Here's what they do, so you could also write them yourself.

### `package.json`

```json title="package.json"
{
  "name": "my-platform-app",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "packageManager": "yarn@4.18.0",
  "engines": {
    "node": ">=24"
  },
  "scripts": {
    "build": "rm -rf dist && tsc",
    "start": "yarn build && node dist/main.js",
    "test": "yarn build && node --test dist/*.test.js"
  },
  "dependencies": {
    "@3flows/platform": "next"
  },
  "devDependencies": {
    "@types/node": "^24.0.0",
    "typescript": "^6.0.3"
  }
}
```

- `"type": "module"` is required. The platform is an ES module package.
- `packageManager` makes Corepack use the same Yarn version for everyone.
- `next` is the tag of the platform's preview builds, which have everything this tutorial uses. `yarn.lock` pins the exact version, so everyone on the project gets the same build. `yarn up @3flows/platform@next` moves to the newest one.
- `name` and `version` are what the platform reports in `/ping`, OpenAPI and GraphQL. More on that in [chapter 21](./operate-it.md).

### `.yarnrc.yml`

```yaml title=".yarnrc.yml"
# Plain node_modules: the platform and `node --test dist/...` expect them. Yarn's default (Plug'n'Play) doesn't work here.
nodeLinker: node-modules

# The platform is published to GitHub Packages, which needs a token with read:packages.
npmScopes:
  3flows:
    npmRegistryServer: "https://npm.pkg.github.com"
    npmAlwaysAuth: true
    npmAuthToken: "${NPM_REPOSITORY_GH_TOKEN:-}"

# Yarn holds back package versions younger than a day. Our own packages are exempt, so fresh `next` builds install.
npmPreapprovedPackages:
  - "@3flows/*"
```

`npmScopes` sends `@3flows` packages to GitHub Packages, and everything else to the public npm registry. The token is read from an environment variable, so the file can be committed as it is.

### `tsconfig.json`

```json title="tsconfig.json"
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "skipLibCheck": true,
    "rootDir": ".",
    "outDir": "dist"
  },
  "include": ["*.ts"]
}
```

`experimentalDecorators` and `emitDecoratorMetadata` are the two that matter. Without them, `@Register()` doesn't work. `NodeNext` is why imports end in `.js`, even between `.ts` files: `import './services.js'`.

### `platform.yml`

```yaml title="platform.yml"
name: my-platform-app

# One HTTP server. There are no services on it yet, but /health, /ping and /metrics already work.
https:
  - name: api
    port: 3000
```

### `main.ts`

```ts title="main.ts"
import { Platform } from '@3flows/platform';

// Import your services here, before the platform starts, so that YAML can find them.

await Platform.run('./platform.yml');
```

`Platform.run` resolves the path from where you start the process, which is the project folder.

The starter also has `main.test.ts`, which starts the platform and checks `/health`. `yarn test` runs it.

## Run it

```sh
yarn install
yarn start
```

The platform prints its banner and `ready`. In a second terminal:

```sh
curl localhost:3000/health
```

```txt
OK
```

The platform is running, and there's nothing in it yet. That's [chapter 0](./hello-world.md).

## When something goes wrong

| Symptom | Cause |
|---|---|
| `yarn: command not found`, or the wrong Yarn version | Run `corepack enable` |
| `YN0041: @3flows/platform@npm:…: Invalid authentication (as an anonymous user)`, or `401 Unauthorized` | `NPM_REPOSITORY_GH_TOKEN` isn't set in this shell, or the token lacks `read:packages` |
| `All versions satisfying … are quarantined` | Yarn holds back versions younger than a day. `npmPreapprovedPackages` is missing in `.yarnrc.yml` |
| `TS1309: The current file is a CommonJS module and cannot use 'await' at the top level` | `"type": "module"` is missing in `package.json` |
| `TS5052: Option 'emitDecoratorMetadata' cannot be specified without specifying option 'experimentalDecorators'` | `experimentalDecorators` is missing in `tsconfig.json` |
| `cannot register appointmentsservice::default`, then `Cannot read properties of undefined (reading '_initialise')` | YAML names a service that isn't loaded. Import its file in `main.ts` |
| `.pnp.cjs` appears, and modules aren't found | `nodeLinker: node-modules` is missing in `.yarnrc.yml` |
| `EADDRINUSE: address already in use :::3000` | Another step or app is still running |

## Working on the platform itself

To try an unreleased change of the platform in your project, link a local checkout instead of the registry version:

```json title="package.json"
"dependencies": {
  "@3flows/platform": "portal:../platform"
}
```

Run `yarn build` in the platform after every change. The `portal:` link follows the checkout, so your project uses the new build right away. Switch back to `"next"` before you commit.

Next: [Hello World](./hello-world.md)
