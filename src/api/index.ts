/*
 * SPDX-FileCopyrightText: 2026 cod3ddot@proton.me
 *
 * SPDX-License-Identifier: MIT
 */

import { deezerStreamingServices } from "@/api/deezer/index.ts";
import type { FetchOptions } from "@/api/fetch.ts";
import { getLastTrack } from "@/api/lastfm/index.ts";
import { listenbrainzStreamingServices } from "@/api/listenbrainz/index.ts";
import { openwhydStreamingServices } from "@/api/openwhyd/index.ts";
import type {
	MusicTrack,
	ResolvedOptions,
	StreamingServiceProvider,
	StreamingServices,
	TrackQuery
} from "@/types.ts";
import { getCover } from "@/util/cover.ts";

type Provider = (track: TrackQuery, options: FetchOptions) => Promise<StreamingServices>;

const PROVIDERS: Record<StreamingServiceProvider, Provider> = {
	deezer: deezerStreamingServices,
	listenbrainz: listenbrainzStreamingServices,
	openwhyd: openwhydStreamingServices
};

/** Something went wrong, but the track can still be built without it. */
export type Warn = (message: string) => void;

const reason = (error: unknown): string => (error instanceof Error ? error.message : String(error));

/** Queries `providers` in parallel. Failed providers are reported and skipped. */
async function getStreamingServices(
	track: TrackQuery,
	providers: StreamingServiceProvider[],
	options: FetchOptions,
	warn: Warn
): Promise<StreamingServices> {
	const results = await Promise.allSettled(providers.map((p) => PROVIDERS[p](track, options)));

	let services: StreamingServices = {};
	results.forEach((result, i) => {
		if (result.status === "fulfilled") {
			// Earlier providers win.
			services = { ...result.value, ...services };
		} else {
			warn(`${providers[i]} failed: ${reason(result.reason)}`);
		}
	});
	return services;
}

/** Whether two scrobbles are the same song, so its links and cover can be reused. */
export const sameSong = (a: TrackQuery, b: TrackQuery): boolean =>
	a.title === b.title && a.artist === b.artist && a.album === b.album;

/**
 * Fetches the last track of the user with its cover and streaming links.
 * Throws when Last.fm fails; returns `null` when the user has no scrobbles.
 *
 * When the scrobble is the same song as `previous`, its links and cover are reused: only Last.fm
 * is asked, which keeps polling cheap.
 */
export async function fetchMusicTrack(
	options: ResolvedOptions,
	warn: Warn,
	previous: MusicTrack | null = null
): Promise<MusicTrack | null> {
	const fetchOptions = { timeout: options.timeout };
	const track = await getLastTrack(options.apiKey, options.userId, fetchOptions);

	if (!track) {
		return null;
	}

	const reused = previous && sameSong(previous, track) ? previous : null;
	const [services, cover] = reused
		? [reused.services, reused.cover]
		: await Promise.all([
				getStreamingServices(track, options.providers, fetchOptions, warn),
				getCover(track.imageUrl, options).catch((error: unknown) => {
					warn(`cover failed: ${reason(error)}`);
					return null;
				})
			]);

	return {
		album: track.album,
		artist: track.artist,
		cover,
		mbid: track.mbid,
		nowPlaying: track.nowPlaying,
		playedAt: track.playedAt,
		services,
		title: track.title,
		url: track.url
	};
}
