/*
 * SPDX-FileCopyrightText: 2026 cod3ddot@proton.me
 *
 * SPDX-License-Identifier: MIT
 */

// biome-ignore-all lint/complexity/noExcessiveLinesPerFunction: tests

import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { MusicTrack } from "../src/types.ts";

const VIRTUAL_ID = "virtual:ausculto";
const RESOLVED_ID = `\0${VIRTUAL_ID}`;
const MODULE_PREFIX = /^export const musicTrack = /;
const MODULE_SUFFIX = /;\s*$/;

const mockFetchMusicTrack = mock((): Promise<MusicTrack | null> => Promise.resolve(null));

mock.module("../src/api/index.ts", () => ({ fetchMusicTrack: mockFetchMusicTrack }));

const { createPlugin } = await import("../src/plugin.ts");

const pluginContext = {
	debug: mock((_msg: string) => {}),
	info: mock((_msg: string) => {}),
	warn: mock((_msg: string) => {})
};

const mockTrack: MusicTrack = {
	album: "Test Album",
	artist: "Test Artist",
	cover: {
		size: 300,
		thumbnail: "data:image/webp;base64,test",
		url: "https://lastfm.freetls.fastly.net/i/u/300x300/abc.jpg"
	},
	mbid: null,
	nowPlaying: false,
	playedAt: "2026-10-24T12:00:00.000Z",
	services: {},
	title: "Test Song",
	url: "https://www.last.fm/music/Test+Artist/_/Test+Song"
};

type PluginOptions = Parameters<typeof createPlugin>[0];

function makePlugin(overrides: Partial<PluginOptions> = {}) {
	return createPlugin({ apiKey: "testkey", userId: "testuser", ...overrides });
}

type HookWithFilter = { filter: { id: RegExp }; handler: (...args: unknown[]) => unknown };

/** Calls a filtered hook the way Rolldown does: only when the filter matches. */
function callHook(hook: unknown, id: string) {
	const { filter, handler } = hook as HookWithFilter;
	return filter.id.test(id) ? handler.call(pluginContext, id) : undefined;
}

const load = (plugin: ReturnType<typeof makePlugin>, id = RESOLVED_ID) =>
	callHook(plugin.load, id) as Promise<string> | undefined;

async function loadTrack(plugin: ReturnType<typeof makePlugin>): Promise<MusicTrack | null> {
	const code = (await load(plugin)) ?? "";
	return JSON.parse(code.replace(MODULE_PREFIX, "").replace(MODULE_SUFFIX, ""));
}

describe("createPlugin", () => {
	beforeEach(() => {
		mockFetchMusicTrack.mockReset();
		mockFetchMusicTrack.mockResolvedValue(mockTrack);
		for (const log of Object.values(pluginContext)) {
			log.mockReset();
		}
	});

	describe("options", () => {
		it("throws when apiKey is missing", () => {
			expect(() => makePlugin({ apiKey: "" })).toThrow("API key and user ID must be specified");
		});

		it("throws when userId is missing", () => {
			expect(() => makePlugin({ userId: "" })).toThrow("API key and user ID must be specified");
		});

		it("throws on unknown providers", () => {
			// @ts-expect-error removed provider
			expect(() => makePlugin({ providers: ["odesli"] })).toThrow("Unknown providers: odesli");
		});

		it("throws on sizes Last.fm does not serve", () => {
			// @ts-expect-error invalid size
			expect(() => makePlugin({ thumbnailSize: 50 })).toThrow("thumbnailSize");
			// @ts-expect-error invalid size
			expect(() => makePlugin({ coverSize: 500 })).toThrow("coverSize");
		});

		it("passes defaults to the fetcher", async () => {
			await load(makePlugin());
			expect(mockFetchMusicTrack).toHaveBeenCalledWith(
				{
					apiKey: "testkey",
					cacheTTL: 300_000,
					coverSize: 300,
					providers: ["listenbrainz", "itunes", "deezer", "openwhyd"],
					thumbnailSize: 64,
					timeout: 10_000,
					userId: "testuser"
				},
				expect.any(Function)
			);
		});

		it("deduplicates providers", async () => {
			await load(makePlugin({ providers: ["deezer", "deezer"] }));
			expect(mockFetchMusicTrack).toHaveBeenCalledWith(
				expect.objectContaining({ providers: ["deezer"] }),
				expect.any(Function)
			);
		});
	});

	describe("hooks", () => {
		it("has the correct plugin name", () => {
			expect(makePlugin().name).toBe("ausculto");
		});

		it("resolves the virtual module ID", () => {
			expect(callHook(makePlugin().resolveId, VIRTUAL_ID)).toBe(RESOLVED_ID);
		});

		it("ignores other IDs", () => {
			const plugin = makePlugin();
			expect(callHook(plugin.resolveId, "some-other-module")).toBeUndefined();
			expect(callHook(plugin.resolveId, `${VIRTUAL_ID}-suffix`)).toBeUndefined();
			expect(load(plugin, "\0some-other-module")).toBeUndefined();
		});
	});

	describe("load", () => {
		it("returns an ES module", async () => {
			expect(await load(makePlugin())).toMatch(MODULE_PREFIX);
		});

		it("serializes the track", async () => {
			expect(await loadTrack(makePlugin())).toEqual(mockTrack);
		});

		it("round-trips special and unicode characters", async () => {
			const track = {
				...mockTrack,
				album: "Album\nWith\tSpecial Chars",
				artist: "Артист & The Band",
				title: `Song with "quotes", 'apostrophes' and 音楽 🎵`
			};
			mockFetchMusicTrack.mockResolvedValue(track);
			expect(await loadTrack(makePlugin())).toEqual(track);
		});

		it("exports null when the user has no scrobbles", async () => {
			mockFetchMusicTrack.mockResolvedValue(null);
			expect(await loadTrack(makePlugin())).toBeNull();
		});

		it("forwards provider warnings to the plugin context", async () => {
			mockFetchMusicTrack.mockImplementation((...args: unknown[]) => {
				(args[1] as (message: string) => void)("deezer failed: boom");
				return Promise.resolve(mockTrack);
			});
			await load(makePlugin());
			expect(pluginContext.warn).toHaveBeenCalledWith("deezer failed: boom");
		});
	});

	describe("failures", () => {
		it("exports null and warns instead of failing the build", async () => {
			mockFetchMusicTrack.mockRejectedValue(new Error("Network error"));

			expect(await loadTrack(makePlugin())).toBeNull();
			expect(pluginContext.warn).toHaveBeenCalledWith(
				"could not fetch from Last.fm, exporting null: Network error"
			);
		});

		it("falls back to the previous track once the cache expired", async () => {
			const plugin = makePlugin({ cacheTTL: 0 });
			await load(plugin);
			await Bun.sleep(5);

			mockFetchMusicTrack.mockRejectedValue(new Error("Network error"));
			expect(await loadTrack(plugin)).toEqual(mockTrack);
			expect(pluginContext.warn).toHaveBeenCalledWith(
				"could not fetch from Last.fm, using the previous track: Network error"
			);
		});

		it("does not cache failures", async () => {
			mockFetchMusicTrack.mockRejectedValueOnce(new Error("Network error"));
			const plugin = makePlugin();

			expect(await loadTrack(plugin)).toBeNull();
			expect(await loadTrack(plugin)).toEqual(mockTrack);
			expect(mockFetchMusicTrack).toHaveBeenCalledTimes(2);
		});
	});

	describe("caching", () => {
		it("reuses the track within the TTL", async () => {
			const plugin = makePlugin();
			await load(plugin);
			await load(plugin);
			await load(plugin);
			expect(mockFetchMusicTrack).toHaveBeenCalledTimes(1);
		});

		it("caches users without scrobbles too", async () => {
			mockFetchMusicTrack.mockResolvedValue(null);
			const plugin = makePlugin();
			await load(plugin);
			await load(plugin);
			expect(mockFetchMusicTrack).toHaveBeenCalledTimes(1);
		});

		it("refetches after the TTL expires", async () => {
			const plugin = makePlugin({ cacheTTL: 10 });
			await load(plugin);
			await Bun.sleep(20);
			await load(plugin);
			expect(mockFetchMusicTrack).toHaveBeenCalledTimes(2);
		});

		it("shares one request between concurrent loads", async () => {
			const plugin = makePlugin();
			const tracks = await Promise.all([loadTrack(plugin), loadTrack(plugin)]);
			expect(tracks).toEqual([mockTrack, mockTrack]);
			expect(mockFetchMusicTrack).toHaveBeenCalledTimes(1);
		});

		it("keeps separate caches per instance", async () => {
			mockFetchMusicTrack
				.mockResolvedValueOnce({ ...mockTrack, title: "Song 1" })
				.mockResolvedValueOnce({ ...mockTrack, title: "Song 2" });

			expect((await loadTrack(makePlugin()))?.title).toBe("Song 1");
			expect((await loadTrack(makePlugin()))?.title).toBe("Song 2");
		});
	});
});
