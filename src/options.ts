/*
 * SPDX-FileCopyrightText: 2026 cod3ddot@proton.me
 *
 * SPDX-License-Identifier: MIT
 */

import type { LastFmPluginOptions, ResolvedOptions, StreamingServiceProvider } from "@/types.ts";

const ALL_PROVIDERS: readonly StreamingServiceProvider[] = ["listenbrainz", "deezer", "openwhyd"];
const THUMBNAIL_SIZES: readonly number[] = [34, 64, 174];
const COVER_SIZES: readonly number[] = [300, 770];

const DEFAULT_OPTIONS: Omit<ResolvedOptions, "apiKey" | "userId"> = {
	cacheTTL: 5 * 60 * 1000,
	coverSize: 300,
	providers: [...ALL_PROVIDERS],
	thumbnailSize: 64,
	timeout: 10_000
};

/** Fills in defaults and validates. Throws on missing credentials or unknown values. */
export function resolveOptions(options: LastFmPluginOptions): ResolvedOptions {
	if (!(options.apiKey && options.userId)) {
		throw new Error("API key and user ID must be specified");
	}

	const resolved = { ...DEFAULT_OPTIONS, ...options };

	const unknown = resolved.providers.filter((p) => !ALL_PROVIDERS.includes(p));
	if (unknown.length > 0) {
		throw new Error(
			`Unknown providers: ${unknown.join(", ")}. Available: ${ALL_PROVIDERS.join(", ")}`
		);
	}
	if (!THUMBNAIL_SIZES.includes(resolved.thumbnailSize)) {
		throw new Error(`thumbnailSize must be one of ${THUMBNAIL_SIZES.join(", ")}`);
	}
	if (!COVER_SIZES.includes(resolved.coverSize)) {
		throw new Error(`coverSize must be one of ${COVER_SIZES.join(", ")}`);
	}

	return { ...resolved, providers: [...new Set(resolved.providers)] };
}
