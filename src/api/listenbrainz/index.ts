/*
 * SPDX-FileCopyrightText: 2026 cod3ddot@proton.me
 *
 * SPDX-License-Identifier: MIT
 */

// biome-ignore lint/performance/noNamespaceImport: preferred way
import * as z from "zod/mini";
import { type FetchOptions, fetchJson } from "@/api/fetch.ts";
import type { StreamingServices, TrackQuery } from "@/types.ts";

const SpotifySchema = z.array(z.object({ spotify_track_ids: z.optional(z.array(z.string())) }));
const AppleSchema = z.array(z.object({ apple_music_track_ids: z.optional(z.array(z.string())) }));

const BASE = "https://labs.api.listenbrainz.org";

/** Spotify and Apple Music links from ListenBrainz' metadata matching. */
export async function listenbrainzStreamingServices(
	{ title, album, artist }: TrackQuery,
	options: FetchOptions
): Promise<StreamingServices> {
	const params = new URLSearchParams({ artist_name: artist, track_name: title });
	if (album) {
		params.set("release_name", album);
	}

	const [spotify, apple] = await Promise.all([
		fetchJson(`${BASE}/spotify-id-from-metadata/json?${params}`, SpotifySchema, options),
		fetchJson(`${BASE}/apple-music-id-from-metadata/json?${params}`, AppleSchema, options)
	]);

	const spotifyId = spotify[0]?.spotify_track_ids?.[0];
	const appleId = apple[0]?.apple_music_track_ids?.[0];

	return {
		...(spotifyId && { spotify: `https://open.spotify.com/track/${spotifyId}` }),
		// No storefront in the path: Apple redirects to the visitor's own.
		...(appleId && { apple: `https://music.apple.com/song/${appleId}` })
	};
}
