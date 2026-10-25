/*
 * SPDX-FileCopyrightText: 2026 cod3ddot@proton.me
 *
 * SPDX-License-Identifier: MIT
 */

// biome-ignore lint/performance/noNamespaceImport: preferred way
import * as z from "zod/mini";
import { type FetchOptions, fetchJson } from "@/api/fetch.ts";
import type { StreamingServices, TrackQuery } from "@/types.ts";
import { looselyMatches } from "@/util/match.ts";

const OpenwhydSearchSchema = z.object({
	results: z.object({
		// Deleted posts come back as `null`.
		posts: z.array(z.nullable(z.object({ eId: z.string(), name: z.string() })))
	})
});

/** Captures the player and the ID of `/<player>/<id>#<stream URL>`. */
const EID = /^\/([a-z]{2})\/([^#]+)/;

/** Turns an Openwhyd player ID (`/yt/<id>`, `/sc/<path>#<stream>`, …) into a public link. */
export function eIdToService(eId: string): StreamingServices {
	const [, player, id] = EID.exec(eId) ?? [];
	if (!id) {
		return {};
	}

	switch (player) {
		case "yt":
			return { youtube: `https://www.youtube.com/watch?v=${id}` };
		case "sp":
			return { spotify: `https://open.spotify.com/track/${id}` };
		case "dz":
			return { deezer: `https://www.deezer.com/track/${id}` };
		case "sc":
			return { soundcloud: `https://soundcloud.com/${id}` };
		case "bc": {
			const [band, track] = id.split("/");
			return band && track ? { bandcamp: `https://${band}.bandcamp.com/track/${track}` } : {};
		}
		default:
			return {};
	}
}

/** Links that Openwhyd users posted for the track. In practice mostly YouTube. */
export async function openwhydStreamingServices(
	{ title, artist }: TrackQuery,
	options: FetchOptions
): Promise<StreamingServices> {
	const url = new URL("https://openwhyd.org/search");
	url.searchParams.set("q", `${artist} ${title}`);
	url.searchParams.set("format", "json");

	const { results } = await fetchJson(url, OpenwhydSearchSchema, options);

	// Post names are free text like "Artist - Title". Search is fuzzy, so skip unrelated posts.
	let services: StreamingServices = {};
	for (const post of results.posts) {
		if (post && looselyMatches(post.name, title) && looselyMatches(post.name, artist)) {
			// The first post wins per service.
			services = { ...eIdToService(post.eId), ...services };
		}
	}
	return services;
}
