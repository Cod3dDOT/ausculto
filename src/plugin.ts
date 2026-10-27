/*
 * SPDX-FileCopyrightText: 2026 cod3ddot@proton.me
 *
 * SPDX-License-Identifier: MIT
 */

import type { Plugin, PluginContext } from "rolldown";
import { fetchMusicTrack } from "@/api/index.ts";
import { resolveOptions } from "@/options.ts";
import type { LastFmPluginOptions, MusicTrack } from "@/types.ts";
import { Cache } from "@/util/cache.ts";

const VIRTUAL_MODULE_ID = "virtual:ausculto";
const RESOLVED_VIRTUAL_MODULE_ID = `\0${VIRTUAL_MODULE_ID}`;

export function createPlugin(options: LastFmPluginOptions): Plugin {
	const resolvedOptions = resolveOptions(options);
	// Wrapped, so that "the user has no scrobbles" (null) is cached too.
	const cache = new Cache<{ track: MusicTrack | null }>(resolvedOptions.cacheTTL);
	// Shared by concurrent loads, e.g. Vite's client and SSR builds.
	let pending: Promise<MusicTrack | null> | null = null;

	async function refresh(ctx: PluginContext): Promise<MusicTrack | null> {
		try {
			const track = await fetchMusicTrack(resolvedOptions, (message) => ctx.warn(message));
			cache.set({ track });
			ctx.info(track ? `fetched "${track.artist} - ${track.title}"` : "no scrobbles yet");
			return track;
		} catch (error) {
			// Never break the site build because Last.fm is down.
			const stale = cache.stale();
			const fallback = stale ? "using the previous track" : "exporting null";
			const reason = error instanceof Error ? error.message : String(error);
			ctx.warn(`could not fetch from Last.fm, ${fallback}: ${reason}`);
			return stale?.track ?? null;
		} finally {
			pending = null;
		}
	}

	function getTrack(ctx: PluginContext): Promise<MusicTrack | null> {
		const cached = cache.get();
		if (cached) {
			ctx.debug("using cached track");
			return Promise.resolve(cached.track);
		}
		pending ??= refresh(ctx);
		return pending;
	}

	return {
		load: {
			filter: { id: new RegExp(`^${RESOLVED_VIRTUAL_MODULE_ID}$`) },
			async handler() {
				const track = await getTrack(this);
				return `export const musicTrack = ${JSON.stringify(track, null, "\t")};\n`;
			}
		},
		name: "ausculto",
		resolveId: {
			filter: { id: new RegExp(`^${VIRTUAL_MODULE_ID}$`) },
			handler() {
				return RESOLVED_VIRTUAL_MODULE_ID;
			}
		}
	};
}
