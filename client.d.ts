/*
 * SPDX-FileCopyrightText: 2026 cod3ddot@proton.me
 *
 * SPDX-License-Identifier: MIT
 */

// Types for the virtual module. Reference them from any `.d.ts` in your project:
// /// <reference types="rolldown-plugin-listening-to/client" />

// biome-ignore lint/correctness/noUnresolvedImports: ambient declaration of the virtual module
declare module "virtual:rolldown-plugin-listening-to" {
	/** The last track of the Last.fm user, or `null` if they have no scrobbles or Last.fm failed. */
	export const musicTrack: import("rolldown-plugin-listening-to").MusicTrack | null;
}
