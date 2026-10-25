/*
 * SPDX-FileCopyrightText: 2026 cod3ddot@proton.me
 *
 * SPDX-License-Identifier: MIT
 */

const DIACRITICS = /\p{Diacritic}/gu;
const NON_ALPHANUMERIC = /[^\p{L}\p{N}]+/gu;

/** Lowercase, without diacritics, spaces or punctuation: `"Beyoncé - Halo!"` becomes `"beyoncehalo"`. */
export const normalize = (text: string): string =>
	text.normalize("NFKD").replace(DIACRITICS, "").toLowerCase().replace(NON_ALPHANUMERIC, "");

/**
 * Loose comparison for titles coming from different services, which disagree on suffixes
 * like "- Remastered 2011" or "(feat. …)": true when one contains the other.
 */
export function looselyMatches(a: string, b: string): boolean {
	const x = normalize(a);
	const y = normalize(b);
	return x.length > 0 && y.length > 0 && (x.includes(y) || y.includes(x));
}
