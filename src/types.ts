/*
 * SPDX-FileCopyrightText: 2026 cod3ddot@proton.me
 *
 * SPDX-License-Identifier: MIT
 */

export type StreamingServiceProvider = "listenbrainz" | "deezer" | "openwhyd";

export interface StreamingServices {
	spotify?: string;
	apple?: string;
	deezer?: string;
	youtube?: string;
	soundcloud?: string;
	bandcamp?: string;
}

/** Sizes Last.fm serves thumbnails in, in pixels. */
export type ThumbnailSize = 34 | 64 | 174;

/** Sizes Last.fm serves full covers in, in pixels. `770` is the largest Last.fm keeps. */
export type CoverSize = 300 | 770;

export interface MusicCover {
	/** Small square WebP, inlined as a base64 data URI. Good as an icon or a blurred placeholder. */
	thumbnail: string;
	/** Remote Last.fm CDN URL of the full cover, in its original format. */
	url: string;
	/** Requested edge length of `url`. Covers smaller than this are served at their own size. */
	size: CoverSize;
}

export interface MusicTrack {
	title: string;
	artist: string;
	/** Empty string when Last.fm has no album for the scrobble. */
	album: string;
	/** Last.fm page of the track. */
	url: string;
	/** MusicBrainz recording ID, when Last.fm knows it. */
	mbid: string | null;
	/** Whether the track was playing when the data was fetched. */
	nowPlaying: boolean;
	/** ISO 8601 time of the scrobble, or `null` while the track is playing. */
	playedAt: string | null;
	/** `null` when Last.fm has no artwork for the track. */
	cover: MusicCover | null;
	services: StreamingServices;
}

export interface LastFmPluginOptions {
	/** Last.fm username. */
	userId: string;
	/** Last.fm API key, from https://www.last.fm/api/account/create */
	apiKey: string;
	/**
	 * Providers to query for streaming links. Earlier providers win when two find the same service.
	 * @default ["listenbrainz", "deezer", "openwhyd"]
	 */
	providers?: StreamingServiceProvider[];
	/**
	 * Edge length of the inlined thumbnail, in pixels.
	 * @default 64
	 */
	thumbnailSize?: ThumbnailSize;
	/**
	 * Edge length of the full cover URL, in pixels.
	 * @default 300
	 */
	coverSize?: CoverSize;
	/**
	 * How long a fetched track is reused, in milliseconds.
	 * @default 300_000 (5 minutes)
	 */
	cacheTTL?: number;
	/**
	 * Timeout for each HTTP request, in milliseconds.
	 * @default 10_000
	 */
	timeout?: number;
}

/** @internal What providers search with. */
export interface TrackQuery {
	title: string;
	artist: string;
	album: string;
}

/** @internal */
export type ResolvedOptions = Required<LastFmPluginOptions>;
