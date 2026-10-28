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

/** Separators between credited artists: "A & B", "A, B", "A feat. B", "A x B". */
const CREDIT_SEPARATOR = /\s*(?:,|&|\+|\/|;|\s(?:x|×|feat\.?|ft\.?|featuring)\s)\s*/iu;

const credits = (artist: string): string[] =>
	artist
		.split(CREDIT_SEPARATOR)
		.map(normalize)
		.filter((name) => name.length > 0);

/**
 * Whether two artist credits share an artist. Services credit the same song differently: Last.fm
 * may say "Hwungii" where Apple says "Hwungii & DJ VGK1".
 */
export function sameArtist(a: string, b: string): boolean {
	const names = new Set(credits(a));
	return credits(b).some((name) => names.has(name));
}

/**
 * The item whose title is the same as `title` once normalized, else the first that loosely
 * matches it. Search results list "Song", "Song (Slowed)", "Song (Super Slowed)"…: a loose match
 * alone would take whichever comes first.
 */
export function bestTitleMatch<T>(
	items: T[],
	titleOf: (item: T) => string,
	title: string
): T | undefined {
	const wanted = normalize(title);
	return (
		items.find((item) => normalize(titleOf(item)) === wanted) ??
		items.find((item) => looselyMatches(titleOf(item), title))
	);
}
