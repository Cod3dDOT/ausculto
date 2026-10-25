/*
 * SPDX-FileCopyrightText: 2026 cod3ddot@proton.me
 *
 * SPDX-License-Identifier: MIT
 */

// biome-ignore lint/performance/noBarrelFile: library entry point, not an app barrel
export { createPlugin as ausculto, createPlugin as default } from "@/plugin.ts";
export type {
	CoverSize,
	LastFmPluginOptions,
	MusicCover,
	MusicTrack,
	StreamingServiceProvider,
	StreamingServices,
	ThumbnailSize
} from "@/types.ts";
