/*
 * SPDX-FileCopyrightText: 2026 cod3ddot@proton.me
 *
 * SPDX-License-Identifier: MIT
 */

// biome-ignore lint/performance/noNamespaceImport: preferred way
import * as z from "zod/mini";
import { type FetchOptions, fetchJson } from "@/api/fetch.ts";
import type { StreamingServices, TrackQuery } from "@/types.ts";
import { bestTitleMatch, sameArtist } from "@/util/match.ts";

const ITunesSearchSchema = z.object({
	results: z.array(
		z.object({
			artistName: z.string(),
			trackId: z.number(),
			trackName: z.string()
		})
	)
});

/** Apple Music link from the iTunes Search API (public, no key). */
export async function itunesStreamingServices(
	{ title, artist }: TrackQuery,
	options: FetchOptions
): Promise<StreamingServices> {
	const url = new URL("https://itunes.apple.com/search");
	url.searchParams.set("term", `${artist} ${title}`);
	url.searchParams.set("media", "music");
	url.searchParams.set("entity", "song");
	url.searchParams.set("limit", "10");

	const { results } = await fetchJson(url, ITunesSearchSchema, options);

	// Search is fuzzy: only the same artist (co-credits allowed), the closest title first.
	const hit = bestTitleMatch(
		results.filter((track) => sameArtist(track.artistName, artist)),
		(track) => track.trackName,
		title
	);

	// No storefront in the path: Apple redirects to the visitor's own.
	return hit ? { apple: `https://music.apple.com/song/${hit.trackId}` } : {};
}
