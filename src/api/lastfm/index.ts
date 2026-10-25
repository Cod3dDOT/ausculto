/*
 * SPDX-FileCopyrightText: 2026 cod3ddot@proton.me
 *
 * SPDX-License-Identifier: MIT
 */

// biome-ignore lint/performance/noNamespaceImport: preferred way
import * as z from "zod/mini";
import { type FetchOptions, fetchJson } from "@/api/fetch.ts";

const TextSchema = z.object({ "#text": z.string() });

const LastFmTrackSchema = z.object({
	"@attr": z.optional(z.object({ nowplaying: z.optional(z.string()) })),
	album: TextSchema,
	artist: TextSchema,
	date: z.optional(z.object({ uts: z.string() })),
	image: z.optional(z.array(TextSchema)),
	mbid: z.optional(z.string()),
	name: z.string(),
	url: z.string()
});

const LastFmRecentTracksSchema = z.object({
	recenttracks: z.object({
		// Last.fm has been known to send a bare object instead of a one-element array.
		track: z.union([z.array(LastFmTrackSchema), LastFmTrackSchema])
	})
});

export interface LastFmTrack {
	title: string;
	artist: string;
	album: string;
	url: string;
	mbid: string | null;
	nowPlaying: boolean;
	playedAt: string | null;
	/** Any size of the cover on the Last.fm CDN, or `null` when there is none. */
	imageUrl: string | null;
}

/** Fetches the most recent scrobble (or the playing track) of `user`. Returns `null` if there is none. */
export async function getLastTrack(
	apiKey: string,
	user: string,
	options: FetchOptions
): Promise<LastFmTrack | null> {
	const url = new URL("https://ws.audioscrobbler.com/2.0/");
	url.search = new URLSearchParams({
		api_key: apiKey,
		format: "json",
		limit: "1",
		method: "user.getrecenttracks",
		user
	}).toString();

	const { recenttracks } = await fetchJson(url, LastFmRecentTracksSchema, options);
	const track = Array.isArray(recenttracks.track) ? recenttracks.track[0] : recenttracks.track;

	if (!track) {
		return null;
	}

	const uts = Number(track.date?.uts);

	return {
		album: track.album["#text"],
		artist: track.artist["#text"],
		imageUrl: track.image?.findLast((image) => image["#text"])?.["#text"] ?? null,
		mbid: track.mbid || null,
		nowPlaying: track["@attr"]?.nowplaying === "true",
		playedAt: Number.isFinite(uts) ? new Date(uts * 1000).toISOString() : null,
		title: track.name,
		url: track.url
	};
}
