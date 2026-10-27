/*
 * SPDX-FileCopyrightText: 2026 cod3ddot@proton.me
 *
 * SPDX-License-Identifier: MIT
 */

// Runtime entry: the same lookup as the plugin, for servers and edge workers (Cloudflare Workers,
// Deno, Bun, Node). No bundler and no Node built-ins, only `fetch` and `btoa`.

import { fetchMusicTrack as fetchTrack } from "@/api/index.ts";
import { resolveOptions } from "@/options.ts";
import type { LastFmPluginOptions, MusicTrack } from "@/types.ts";

export type {
	CoverSize,
	LastFmPluginOptions,
	MusicCover,
	MusicTrack,
	StreamingServiceProvider,
	StreamingServices,
	ThumbnailSize
} from "@/types.ts";

export interface FetchTrackOptions {
	/**
	 * The track from the previous call. When the user is still on the same song, its links and
	 * cover are reused and only Last.fm is asked.
	 */
	previous?: MusicTrack | null;
	/** Called for problems the track was still built without, like a failed provider. */
	warn?: (message: string) => void;
}

/**
 * Fetches the last Last.fm track of the user, with its cover and streaming links.
 * Throws when Last.fm fails; returns `null` when the user has no scrobbles. `cacheTTL` is ignored:
 * caching is up to the caller (e.g. an HTTP cache in front of it).
 */
export function fetchMusicTrack(
	options: LastFmPluginOptions,
	{ previous = null, warn = () => {} }: FetchTrackOptions = {}
): Promise<MusicTrack | null> {
	return fetchTrack(resolveOptions(options), warn, previous);
}
