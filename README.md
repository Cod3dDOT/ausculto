[![ausculto](./docs/github-header.gif)](https://github.com/cod3ddot/ausculto)

<div align="center">
  <a href="https://opensource.org/license/mit" target="_blank" rel="noopener noreferrer">
    <img src="https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge" alt="License: MIT" />
  </a>

  <a href="https://github.com/cod3ddot/ausculto/releases">
    <img src="https://img.shields.io/github/v/tag/cod3ddot/ausculto?label=version&style=for-the-badge&color=blue&logo=git&logoColor=white" alt="Version" />
  </a>

  <a href="https://www.typescriptlang.org">
    <img src="https://img.shields.io/badge/TypeScript-3178C6.svg?style=for-the-badge&logo=typescript&logoColor=white" alt="Language: TypeScript" />
  </a>
</div>

# ausculto

_Latin: "I listen"._

[Rolldown](https://rolldown.rs) and [Vite](https://vite.dev) plugin that puts your last [Last.fm](https://www.last.fm) track into your site at build time.

Fetches the track you are playing (or played last), its cover art and links to it on streaming services, and exports them from a virtual module. No API keys besides Last.fm's.

## Supported Services

|              | Spotify | Apple Music | Deezer | YouTube | SoundCloud | Bandcamp |
| ------------ | ------- | ----------- | ------ | ------- | ---------- | -------- |
| ListenBrainz | ✓       | ✓           | –      | –       | –          | –        |
| Deezer       | –       | –           | ✓      | –       | –          | –        |
| Openwhyd *   | ✓       | –           | ✓      | ✓       | ✓          | ✓        |

\* Links posted by [Openwhyd](https://openwhyd.org) users, so mostly YouTube, and only for songs someone posted.

When several providers find the same service, the one listed first in `providers` wins.

## Requirements

- Node.js 22 or newer (or Bun)
- Rolldown 1, or Vite 8 (and anything built on it, like Astro)
- A Last.fm API key: [create one here](https://www.last.fm/api/account/create), it's free

## Quick Setup

The package is not on npm. Install it from a [release](https://github.com/cod3ddot/ausculto/releases):

```bash
bun add https://github.com/cod3ddot/ausculto/releases/download/v0.1.0/ausculto-0.1.0.tgz
```

Or build it yourself (needs [Bun](https://bun.sh)):

```bash
git clone https://github.com/cod3ddot/ausculto
cd ausculto
bun install
bun run build    # outputs to dist/
bun pm pack      # creates the .tgz to install
```

## Project Structure

```
├── LICENSES/               # REUSE licenses (See README)
├── src/
│   ├── api/                # One directory per service
│   │   ├── lastfm/
│   │   ├── listenbrainz/
│   │   ├── deezer/
│   │   ├── openwhyd/
│   │   ├── fetch.ts        # Fetching with timeouts and validation
│   │   └── index.ts        # Builds a track from all services
│   ├── util/
│   │   ├── cache.ts        # Keeps the track between loads
│   │   ├── cover.ts        # Last.fm cover URLs and thumbnail
│   │   └── match.ts        # Compares titles across services
│   ├── index.ts            # Entry point
│   ├── plugin.ts           # The plugin and its options
│   └── types.ts            # Public types
├── test/
├── client.d.ts             # Types for the virtual module
├── CHANGES.md              # Changelog
└── README.md               # This file
```

## Usage

1. Add the plugin to your config:

   ```ts
   // vite.config.ts (or rolldown.config.ts)
   import { defineConfig, loadEnv } from "vite";
   import { ausculto } from "ausculto";

   const env = loadEnv(process.env.NODE_ENV ?? "development", process.cwd(), "");

   export default defineConfig({
   	plugins: [
   		ausculto({
   			apiKey: env.LASTFM_KEY,
   			userId: env.LASTFM_USER
   		})
   	]
   });
   ```

   In Astro, put it under `vite.plugins` in `astro.config.ts`.

2. Add the types of the virtual module to any `.d.ts` in your project, like `env.d.ts`:

   ```ts
   /// <reference types="ausculto/client" />
   ```

3. Import the track:

   ```ts
   import { musicTrack } from "virtual:ausculto";

   if (musicTrack) {
   	console.log(`${musicTrack.nowPlaying ? "Listening to" : "Last listened to"} ${musicTrack.title}`);
   }
   ```

`musicTrack` is `null` when the user has no scrobbles, or when Last.fm could not be reached and there is no earlier track to fall back to. The build never fails because of an API. Problems are logged as warnings.

The track is fetched when the module is first loaded, then reused for `cacheTTL`. In the dev server that means once per start.

### The track

```ts
interface MusicTrack {
	title: string;
	artist: string;
	album: string; // "" when Last.fm has none
	url: string; // Last.fm page of the track
	mbid: string | null; // MusicBrainz recording ID
	nowPlaying: boolean;
	playedAt: string | null; // ISO 8601, null while playing
	cover: {
		thumbnail: string; // data:image/webp;base64,…
		url: string; // full cover on the Last.fm CDN
		size: 300 | 770;
	} | null;
	services: {
		spotify?: string;
		apple?: string;
		deezer?: string;
		youtube?: string;
		soundcloud?: string;
		bandcamp?: string;
	};
}
```

### Cover art

`cover.thumbnail` is small enough to inline, so it works without extra requests and as a blurred placeholder.

`cover.url` is the full cover, linked rather than inlined to keep your bundle small. To serve it in modern formats and sizes, pass it to your framework's image pipeline. For example, Astro's `<Image>` with `image.domains: ["lastfm.freetls.fastly.net"]`. Otherwise, allow the domain in your CSP `img-src`.

## Options

| Option          | Type                                           | Default                                  | Description                                                       |
| --------------- | ---------------------------------------------- | ---------------------------------------- | ----------------------------------------------------------------- |
| `userId`        | `string`                                       | required                                 | Last.fm username                                                  |
| `apiKey`        | `string`                                       | required                                 | Last.fm API key                                                   |
| `providers`     | `("listenbrainz" \| "deezer" \| "openwhyd")[]` | `["listenbrainz", "deezer", "openwhyd"]` | Services to find streaming links with                             |
| `thumbnailSize` | `34 \| 64 \| 174`                              | `64`                                     | Edge of `cover.thumbnail`, in pixels                              |
| `coverSize`     | `300 \| 770`                                   | `300`                                    | Edge of `cover.url`, in pixels (770 is the largest Last.fm keeps) |
| `cacheTTL`      | `number`                                       | `300_000`                                | How long a fetched track is reused, in ms                         |
| `timeout`       | `number`                                       | `10_000`                                 | Timeout of each HTTP request, in ms                               |

## License

This project strives to be [REUSE](https://reuse.software/) compliant.

Generally:

- Documentation is licensed under CC-BY-NC-SA-4.0
- Code is licensed under MIT
- Config files are under CC0-1.0

```
    ausculto: your last Last.fm track in your site
    Copyright (C) 2026  cod3ddot@proton.me

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, subject to the conditions of the MIT
    License. See LICENSES/MIT.txt for the full text.
```
