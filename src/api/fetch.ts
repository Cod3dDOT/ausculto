/*
 * SPDX-FileCopyrightText: 2026 cod3ddot@proton.me
 *
 * SPDX-License-Identifier: MIT
 */

// biome-ignore lint/performance/noNamespaceImport: preferred way
import * as z from "zod/mini";

z.config(z.locales.en());

const USER_AGENT = "ausculto (+https://github.com/cod3ddot/ausculto)";

export interface FetchOptions {
	/** Request timeout, in milliseconds. */
	timeout: number;
}

/** Origin and path only, so query parameters such as API keys never end up in logs. */
const describe = (url: URL | string): string => {
	const { origin, pathname } = new URL(url);
	return origin + pathname;
};

/** Fetches `url` with a timeout and the plugin's User-Agent. Throws on network errors and non-2xx statuses. */
export async function fetchOk(url: URL | string, { timeout }: FetchOptions): Promise<Response> {
	let res: Response;
	try {
		res = await fetch(url, {
			headers: { "User-Agent": USER_AGENT },
			signal: AbortSignal.timeout(timeout)
		});
	} catch (cause) {
		const reason = cause instanceof Error ? cause.message : String(cause);
		throw new Error(`Request to ${describe(url)} failed: ${reason}`, { cause });
	}
	if (!res.ok) {
		throw new Error(`HTTP ${res.status} from ${describe(url)}`);
	}
	return res;
}

/** Fetches `url` and validates the JSON body against `schema`. Throws on any failure. */
export async function fetchJson<T>(
	url: URL | string,
	schema: z.ZodMiniType<T>,
	options: FetchOptions
): Promise<T> {
	const res = await fetchOk(url, options);
	const parsed = schema.safeParse(await res.json());
	if (!parsed.success) {
		throw new Error(`Unexpected response from ${describe(url)}: ${z.prettifyError(parsed.error)}`);
	}
	return parsed.data;
}
