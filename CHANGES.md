# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2026-10-28

### Added

- `itunes` provider: Apple Music links from the iTunes Search API, no key needed. In the default `providers`, after `listenbrainz`. It accepts co-credited artists (a scrobble by "Hwungii" matches "Hwungii & DJ VGK1"; also `,`, `feat.`, `ft.`, `x`) and prefers the exact title over one that only contains it, so "Song (Slowed)" does not link "Song"

## [0.2.0] - 2026-10-27

### Added

- `ausculto/runtime`: `fetchMusicTrack(options, { previous, warn })` fetches the track at runtime, e.g. in a Cloudflare Worker for live updates. Same options and result as the plugin
- `previous`: when the user is still on the same song, its links and cover are reused and only Last.fm is asked

### Changed

- Cover thumbnails are encoded with `btoa` instead of Node's `Buffer`, so the lookup runs outside Node

## [0.1.0] - 2026-10-24

First release. The project was previously developed, but never released, as `rolldown-plugin-listening-to`.

### Added

- `virtual:ausculto` module exporting the last Last.fm track of a user, or `null`
- Track fields: title, artist, album, Last.fm `url`, `mbid`, `nowPlaying` and `playedAt`
- `cover` with an inlined WebP `thumbnail` and a `url` to the full cover, sized with `thumbnailSize` (34, 64, 174) and `coverSize` (300, 770)
- Streaming links from ListenBrainz (Spotify, Apple Music), Deezer and Openwhyd (mostly YouTube), none of which need an API key
- `cacheTTL` and `timeout` options
- `ausculto/client` types for the virtual module
- Release tarballs built in CI and attached to GitHub releases

### Migrating from rolldown-plugin-listening-to

- Import `ausculto` (or the default export) from `ausculto` instead of `RolldownPluginListeningTo` from `rolldown-plugin-listening-to`
- Import from `virtual:ausculto` instead of `virtual:rolldown-plugin-listening-to`, and reference `ausculto/client` for its types
- `albumCover` is now `cover.thumbnail`
- `musicTrack` can be `null`: when Last.fm fails, the build continues and uses the previous track if there is one
- The `musicbrainz` provider is now `listenbrainz`, and `odesli` is gone: its public API was retired on 2026-07-31
- `sharp` is no longer a dependency

[0.3.0]: https://github.com/Cod3dDOT/ausculto/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/Cod3dDOT/ausculto/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/Cod3dDOT/ausculto/releases/tag/v0.1.0
