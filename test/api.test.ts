/*
 * SPDX-FileCopyrightText: 2026 cod3ddot@proton.me
 *
 * SPDX-License-Identifier: MIT
 */

// biome-ignore-all lint/complexity/noExcessiveLinesPerFunction: tests

import { afterEach, describe, expect, it, spyOn } from "bun:test";
import { deezerStreamingServices } from "../src/api/deezer/index.ts";
import { fetchJson } from "../src/api/fetch.ts";
import { getLastTrack } from "../src/api/lastfm/index.ts";
import { listenbrainzStreamingServices } from "../src/api/listenbrainz/index.ts";
import { eIdToService, openwhydStreamingServices } from "../src/api/openwhyd/index.ts";
import { fetchMusicTrack } from "../src/runtime.ts";
import { getCover, toBase64 } from "../src/util/cover.ts";
import { looselyMatches, normalize } from "../src/util/match.ts";

const OPTIONS = { timeout: 1000 };
const QUERY = { album: "OK Computer", artist: "Radiohead", title: "Karma Police" };

/** Answers each request with the result of `respond`, and records the requested URLs. */
function mockFetch(respond: (url: string) => unknown) {
	const urls: string[] = [];
	const spy = spyOn(globalThis, "fetch").mockImplementation((async (input: URL | string) => {
		const url = String(input);
		urls.push(url);
		const body = respond(url);
		return body instanceof Response ? body : Response.json(body);
	}) as typeof fetch);
	return { spy, urls };
}

afterEach(() => {
	(globalThis.fetch as unknown as { mockRestore?: () => void }).mockRestore?.();
});

const lastFmTrack = (overrides: object = {}) => ({
	album: { "#text": "OK Computer" },
	artist: { "#text": "Radiohead" },
	date: { uts: "1700000000" },
	image: [
		{ "#text": "https://lastfm.freetls.fastly.net/i/u/34s/abc123.jpg", size: "small" },
		{ "#text": "", size: "extralarge" }
	],
	mbid: "",
	name: "Karma Police",
	url: "https://www.last.fm/music/Radiohead/_/Karma+Police",
	...overrides
});

describe("fetchJson", () => {
	it("keeps query parameters out of errors", async () => {
		mockFetch(() => new Response("nope", { status: 403 }));
		const url = "https://ws.audioscrobbler.com/2.0/?api_key=SECRET";
		const error = await fetchJson(url, {} as never, OPTIONS).catch((e: Error) => e.message);
		expect(error).toBe("HTTP 403 from https://ws.audioscrobbler.com/2.0/");
	});
});

describe("getLastTrack", () => {
	it("maps a scrobble", async () => {
		const { urls } = mockFetch(() => ({ recenttracks: { track: [lastFmTrack()] } }));

		expect(await getLastTrack("key", "user", OPTIONS)).toEqual({
			album: "OK Computer",
			artist: "Radiohead",
			imageUrl: "https://lastfm.freetls.fastly.net/i/u/34s/abc123.jpg",
			mbid: null,
			nowPlaying: false,
			playedAt: "2023-11-14T22:13:20.000Z",
			title: "Karma Police",
			url: "https://www.last.fm/music/Radiohead/_/Karma+Police"
		});
		expect(new URL(urls[0] ?? "").searchParams.get("limit")).toBe("1");
	});

	it("detects the playing track", async () => {
		const playing = lastFmTrack({ "@attr": { nowplaying: "true" }, date: undefined, mbid: "id" });
		mockFetch(() => ({ recenttracks: { track: [playing, lastFmTrack()] } }));

		const track = await getLastTrack("key", "user", OPTIONS);
		expect(track).toMatchObject({ mbid: "id", nowPlaying: true, playedAt: null });
	});

	it("accepts a bare track object", async () => {
		mockFetch(() => ({ recenttracks: { track: lastFmTrack() } }));
		expect((await getLastTrack("key", "user", OPTIONS))?.title).toBe("Karma Police");
	});

	it("returns null without scrobbles", async () => {
		mockFetch(() => ({ recenttracks: { track: [] } }));
		expect(await getLastTrack("key", "user", OPTIONS)).toBeNull();
	});

	it("throws on Last.fm errors", async () => {
		mockFetch(() => Response.json({ error: 10, message: "Invalid API key" }, { status: 403 }));
		expect(getLastTrack("key", "user", OPTIONS)).rejects.toThrow("HTTP 403");
	});
});

describe("getCover", () => {
	const options = { coverSize: 300, thumbnailSize: 64, ...OPTIONS } as const;

	it("inlines a WebP thumbnail and links the full cover", async () => {
		const { urls } = mockFetch(() => new Response(new Uint8Array([1, 2, 3])));

		expect(await getCover("https://lastfm.freetls.fastly.net/i/u/34s/abc123.png", options)).toEqual(
			{
				size: 300,
				thumbnail: "data:image/webp;base64,AQID",
				url: "https://lastfm.freetls.fastly.net/i/u/300x300/abc123.png"
			}
		);
		expect(urls).toEqual(["https://lastfm.freetls.fastly.net/i/u/64s/abc123.webp"]);
	});

	it("uses the largest Last.fm size", async () => {
		mockFetch(() => new Response(""));
		const cover = await getCover("https://lastfm.freetls.fastly.net/i/u/300x300/abc123.jpg", {
			...options,
			coverSize: 770
		});
		expect(cover?.url).toBe("https://lastfm.freetls.fastly.net/i/u/770x0/abc123.jpg");
	});

	it("skips missing artwork and the placeholder", async () => {
		const { spy } = mockFetch(() => new Response(""));
		expect(await getCover(null, options)).toBeNull();
		expect(
			await getCover(
				"https://lastfm.freetls.fastly.net/i/u/174s/2a96cbd8b46e442fc41c2b86b821562f.png",
				options
			)
		).toBeNull();
		expect(await getCover("https://example.com/cover.jpg", options)).toBeNull();
		expect(spy).not.toHaveBeenCalled();
	});
});

describe("listenbrainz", () => {
	it("builds Spotify and Apple Music links", async () => {
		const { urls } = mockFetch((url) =>
			url.includes("spotify")
				? [{ spotify_track_ids: ["sp1", "sp2"] }]
				: [{ apple_music_track_ids: ["ap1"] }]
		);

		expect(await listenbrainzStreamingServices(QUERY, OPTIONS)).toEqual({
			apple: "https://music.apple.com/song/ap1",
			spotify: "https://open.spotify.com/track/sp1"
		});
		expect(new URL(urls[0] ?? "").searchParams.get("release_name")).toBe("OK Computer");
	});

	it("leaves out missing IDs and an empty album", async () => {
		const { urls } = mockFetch(() => [{}]);
		expect(await listenbrainzStreamingServices({ ...QUERY, album: "" }, OPTIONS)).toEqual({});
		expect(new URL(urls[0] ?? "").searchParams.has("release_name")).toBe(false);
	});
});

describe("deezer", () => {
	it("picks the first result by the same artist", async () => {
		mockFetch(() => ({
			data: [
				{ artist: { name: "Radiohead Tribute" }, link: "wrong", title: "Karma Police" },
				{ artist: { name: "Radiohead" }, link: "right", title: "Karma Police (Remastered)" }
			]
		}));
		expect(await deezerStreamingServices(QUERY, OPTIONS)).toEqual({ deezer: "right" });
	});

	it("returns nothing without a match", async () => {
		mockFetch(() => ({ data: [{ artist: { name: "Other" }, link: "x", title: "Other" }] }));
		expect(await deezerStreamingServices(QUERY, OPTIONS)).toEqual({});
	});
});

describe("openwhyd", () => {
	it("maps player IDs to links", () => {
		expect(eIdToService("/yt/abc")).toEqual({ youtube: "https://www.youtube.com/watch?v=abc" });
		expect(eIdToService("/sp/abc")).toEqual({ spotify: "https://open.spotify.com/track/abc" });
		expect(eIdToService("/dz/123#stream")).toEqual({ deezer: "https://www.deezer.com/track/123" });
		expect(eIdToService("/sc/band/song#https://api.soundcloud.com/tracks/1")).toEqual({
			soundcloud: "https://soundcloud.com/band/song"
		});
		expect(eIdToService("/bc/band/song#stream")).toEqual({
			bandcamp: "https://band.bandcamp.com/track/song"
		});
		expect(eIdToService("/bc/3260779883#stream")).toEqual({});
		expect(eIdToService("http://example.com/song.mp3")).toEqual({});
	});

	it("keeps the first matching post per service", async () => {
		mockFetch(() => ({
			results: {
				posts: [
					null,
					{ eId: "/yt/unrelated", name: "Someone Else - Other Song" },
					{ eId: "/yt/first", name: "Radiohead - Karma Police" },
					{ eId: "/yt/second", name: "RADIOHEAD — Karma Police (live)" }
				]
			}
		}));
		expect(await openwhydStreamingServices(QUERY, OPTIONS)).toEqual({
			youtube: "https://www.youtube.com/watch?v=first"
		});
	});
});

describe("match", () => {
	it("normalizes case, diacritics and punctuation", () => {
		expect(normalize("Beyoncé - Halo!")).toBe("beyoncehalo");
	});

	it("matches when one title contains the other", () => {
		expect(looselyMatches("Karma Police - Remastered 2011", "karma police")).toBe(true);
		expect(looselyMatches("Karma Police", "Paranoid Android")).toBe(false);
		expect(looselyMatches("", "anything")).toBe(false);
	});
});

const RUNTIME_OPTIONS = { apiKey: "key", providers: ["deezer" as const], userId: "user" };

/** Last.fm answers with `name` by `Radiohead`; Deezer and the cover CDN with fixed data. */
function mockServices(name: () => string) {
	const urls: string[] = [];
	spyOn(globalThis, "fetch").mockImplementation((async (input: URL | string) => {
		const url = String(input);
		urls.push(url);
		if (url.includes("audioscrobbler")) {
			return Response.json({
				recenttracks: {
					track: [
						{
							"@attr": { nowplaying: "true" },
							album: { "#text": "OK Computer" },
							artist: { "#text": "Radiohead" },
							image: [{ "#text": "https://lastfm.freetls.fastly.net/i/u/34s/abc123.jpg" }],
							name: name(),
							url: "https://www.last.fm/music/Radiohead"
						}
					]
				}
			});
		}
		if (url.includes("deezer")) {
			return Response.json({
				data: [{ artist: { name: "Radiohead" }, link: "https://deezer.com/1", title: name() }]
			});
		}
		return new Response(new Uint8Array([1, 2, 3]));
	}) as typeof fetch);
	return urls;
}

// Here rather than in their own file: plugin.test.ts mocks src/api/index.ts for the whole process.
describe("fetchMusicTrack (runtime)", () => {
	it("builds the track like the plugin", async () => {
		mockServices(() => "Karma Police");
		const track = await fetchMusicTrack(RUNTIME_OPTIONS);
		expect(track).toMatchObject({
			artist: "Radiohead",
			cover: { thumbnail: "data:image/webp;base64,AQID" },
			nowPlaying: true,
			services: { deezer: "https://deezer.com/1" },
			title: "Karma Police"
		});
	});

	it("only asks Last.fm while the song is unchanged", async () => {
		let name = "Karma Police";
		const urls = mockServices(() => name);
		const first = await fetchMusicTrack(RUNTIME_OPTIONS);
		urls.length = 0;

		const same = await fetchMusicTrack(RUNTIME_OPTIONS, { previous: first });
		expect(urls.every((url) => url.includes("audioscrobbler"))).toBe(true);
		expect(same).toEqual(first);

		name = "Airbag";
		urls.length = 0;
		const next = await fetchMusicTrack(RUNTIME_OPTIONS, { previous: first });
		expect(urls.some((url) => url.includes("deezer"))).toBe(true);
		expect(next?.title).toBe("Airbag");
	});

	it("validates options", () => {
		expect(() => fetchMusicTrack({ apiKey: "", userId: "user" })).toThrow();
	});
});

describe("toBase64", () => {
	it("matches Buffer, also past one chunk", () => {
		const bytes = Uint8Array.from({ length: 70_000 }, (_, i) => (i * 31) % 256);
		expect(toBase64(bytes)).toBe(Buffer.from(bytes).toString("base64"));
		expect(toBase64(new Uint8Array())).toBe("");
	});
});
