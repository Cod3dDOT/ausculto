/*
 * SPDX-FileCopyrightText: 2026 cod3ddot@proton.me
 *
 * SPDX-License-Identifier: MIT
 */

import { type FetchOptions, fetchOk } from "@/api/fetch.ts";
import type { CoverSize, MusicCover, ThumbnailSize } from "@/types.ts";

/** Last.fm's grey star, served when a track has no artwork. */
// biome-ignore lint/security/noSecrets: image hash, not a secret
const PLACEHOLDER_HASH = "2a96cbd8b46e442fc41c2b86b821562f";

const CDN = "https://lastfm.freetls.fastly.net/i/u";

/** Matches `…/i/u/<size>/<hash>.<ext>` and captures hash and extension. */
const LASTFM_IMAGE = /\/i\/u\/[^/]+\/([0-9a-f]+)(\.[a-z]+)?$/i;

const COVER_SEGMENT: Record<CoverSize, string> = { 300: "300x300", 770: "770x0" };

/** Base64 with `btoa` rather than Node's `Buffer`, so covers also work in browsers and edge workers. */
export function toBase64(bytes: Uint8Array): string {
	let binary = "";
	// Chunked: spreading a whole image into one call can overflow the argument limit.
	for (let i = 0; i < bytes.length; i += 0x8000) {
		binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
	}
	return btoa(binary);
}

export interface CoverOptions extends FetchOptions {
	thumbnailSize: ThumbnailSize;
	coverSize: CoverSize;
}

/**
 * Builds the cover from any-size Last.fm image URL. Last.fm resizes and converts on its CDN:
 * the size is a path segment and the format follows the extension.
 *
 * Returns `null` for missing artwork, Last.fm's placeholder, or URLs that are not Last.fm images.
 */
export async function getCover(
	imageUrl: string | null,
	{ thumbnailSize, coverSize, timeout }: CoverOptions
): Promise<MusicCover | null> {
	const match = imageUrl ? LASTFM_IMAGE.exec(imageUrl) : null;
	const hash = match?.[1];
	if (!hash || hash === PLACEHOLDER_HASH) {
		return null;
	}

	const res = await fetchOk(`${CDN}/${thumbnailSize}s/${hash}.webp`, { timeout });
	const base64 = toBase64(new Uint8Array(await res.arrayBuffer()));

	return {
		size: coverSize,
		thumbnail: `data:image/webp;base64,${base64}`,
		url: `${CDN}/${COVER_SEGMENT[coverSize]}/${hash}${match[2] ?? ".jpg"}`
	};
}
