# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-10-24

Cleanup: everything works without API keys besides Last.fm's, the build no longer fails when an API does, and the package is a lot smaller.

### Added

- `nowPlaying`, `playedAt`, `url` and `mbid` on `MusicTrack`
- `cover` with an inlined WebP `thumbnail` and a `url` to the full cover, with `thumbnailSize` (34, 64, 174) and `coverSize` (300, 770) options
- Deezer provider
- `timeout` option for HTTP requests (default 10 s)
- `rolldown-plugin-listening-to/client` types for the virtual module
- Releases are built in CI and attached to GitHub releases

### Changed

- **Breaking:** `albumCover` is replaced by `cover`
- **Breaking:** the `musicbrainz` provider is renamed to `listenbrainz`, which is the service it queries
- **Breaking:** `musicTrack` is `null` when Last.fm fails, instead of failing the build. A previously fetched track is used if there is one
- Concurrent loads (e.g. Vite's client and SSR builds) share one request
- Normal progress is logged as info and debug instead of warnings
- Apple Music links no longer force the US storefront
- Requests send a User-Agent

### Removed

- **Breaking:** Odesli provider, its public API was retired on 2026-07-31
- `sharp` dependency: Last.fm resizes and converts covers itself
- `@rolldown/pluginutils` dependency
- `dist/` is no longer committed

### Fixed

- Openwhyd never returned links: responses always failed validation
- Openwhyd Spotify, Bandcamp, SoundCloud and Deezer links were built from the wrong ID formats
- Openwhyd and Deezer results by other artists or for other songs are skipped
- Album covers were upscaled from Last.fm's 34 px thumbnail
- Last.fm's placeholder was only filtered at one size
- API keys could end up in build logs through error messages
- The virtual module types shipped in the bundle did not take effect

## [0.1.0] - 2026-03-26

Initial release.
