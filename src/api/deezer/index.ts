/*
 * SPDX-FileCopyrightText: 2026 cod3ddot@proton.me
 *
 * SPDX-License-Identifier: MIT
 */

// biome-ignore lint/performance/noNamespaceImport: preferred way
import * as z from "zod/mini";
import { type FetchOptions, fetchJson } from "@/api/fetch.ts";
import type { StreamingServices, TrackQuery } from "@/types.ts";
import { looselyMatches, normalize } from "@/util/match.ts";

const DeezerSearchSchema = z.object({
	data: z.array(
		z.object({
			artist: z.object({ name: z.string() }),
			link: z.string(),
			title: z.string()
		})
	)
});

/** Deezer link from Deezer's public search. */
export async function deezerStreamingServices(
	{ title, artist }: TrackQuery,
	options: FetchOptions
): Promise<StreamingServices> {
	const url = new URL("https://api.deezer.com/search");
	url.searchParams.set("q", `${artist} ${title}`);
	url.searchParams.set("limit", "10");

	// Deezer reports errors as `{ error: … }` with HTTP 200, which fails the schema and throws.
	const { data } = await fetchJson(url, DeezerSearchSchema, options);

	// Search is fuzzy, so only accept the same artist with a matching title.
	const hit = data.find(
		(track) =>
			normalize(track.artist.name) === normalize(artist) && looselyMatches(track.title, title)
	);

	return hit ? { deezer: hit.link } : {};
}
