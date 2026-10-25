/*
 * SPDX-FileCopyrightText: 2026 cod3ddot@proton.me
 *
 * SPDX-License-Identifier: MIT
 */

/** Holds one value for `ttlMs`, and keeps it afterwards as a stale fallback. */
export class Cache<T> {
	readonly #ttl: number;
	#value: { data: T; timestamp: number } | null = null;

	constructor(ttlMs: number) {
		this.#ttl = ttlMs;
	}

	has(): boolean {
		return this.#value !== null && Date.now() - this.#value.timestamp <= this.#ttl;
	}

	/** The value, or `null` when empty or expired. */
	get(): T | null {
		return this.has() && this.#value ? structuredClone(this.#value.data) : null;
	}

	/** The last value regardless of age, or `null` when empty. */
	stale(): T | null {
		return this.#value ? structuredClone(this.#value.data) : null;
	}

	set(data: T): void {
		this.#value = { data: structuredClone(data), timestamp: Date.now() };
	}

	clear(): void {
		this.#value = null;
	}
}
