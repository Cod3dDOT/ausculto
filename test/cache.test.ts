/*
 * SPDX-FileCopyrightText: 2026 cod3ddot@proton.me
 *
 * SPDX-License-Identifier: MIT
 */

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { Cache } from "../src/util/cache.ts";

function setupTimeMock() {
	let originalDateNow: () => number;
	let mockTime: number;

	beforeEach(() => {
		originalDateNow = Date.now;
		mockTime = 1_000_000_000_000;
		Date.now = () => mockTime;
	});

	afterEach(() => {
		Date.now = originalDateNow;
	});

	const advanceTime = (ms: number) => {
		mockTime += ms;
	};

	return { advanceTime };
}

describe("Cache: get", () => {
	const { advanceTime } = setupTimeMock();

	it("returns null when cache is empty", () => {
		const cache = new Cache<string>(5000);
		expect(cache.get()).toBeNull();
	});

	it("returns cached data within TTL", () => {
		const cache = new Cache<string>(5000);
		cache.set("test data");
		expect(cache.get()).toBe("test data");
	});

	it("returns cached data just before TTL expires", () => {
		const cache = new Cache<string>(5000);
		cache.set("test data");

		advanceTime(4999);
		expect(cache.get()).toBe("test data");
	});

	it("returns null after TTL expires", () => {
		const cache = new Cache<string>(5000);
		cache.set("test data");

		advanceTime(5001);
		expect(cache.get()).toBeNull();
	});

	it("works with complex objects", () => {
		interface TestData {
			id: number;
			name: string;
			nested: { value: boolean };
		}

		const cache = new Cache<TestData>(5000);
		const data: TestData = {
			id: 1,
			name: "test",
			nested: { value: true }
		};

		cache.set(data);
		expect(cache.get()).toEqual(data);
	});
});

describe("Cache: set", () => {
	const { advanceTime } = setupTimeMock();

	it("stores data", () => {
		const cache = new Cache<number>(5000);
		cache.set(42);
		expect(cache.get()).toBe(42);
	});

	it("updates existing data", () => {
		const cache = new Cache<string>(5000);
		cache.set("first");
		cache.set("second");
		expect(cache.get()).toBe("second");
	});

	it("resets TTL when data is updated", () => {
		const cache = new Cache<string>(5000);
		cache.set("first");

		advanceTime(3000);
		cache.set("second");

		advanceTime(3000);
		expect(cache.get()).toBe("second");
	});
});

describe("Cache: clear", () => {
	const { advanceTime } = setupTimeMock();

	it("clears cached data", () => {
		const cache = new Cache<string>(5000);
		cache.set("test data");
		cache.clear();
		expect(cache.get()).toBeNull();
	});

	it("resets timestamp", () => {
		const cache = new Cache<string>(5000);
		cache.set("test data");
		cache.clear();
		cache.set("new data");

		advanceTime(4999);
		expect(cache.get()).toBe("new data");
	});

	it("is safe to call on empty cache", () => {
		const cache = new Cache<string>(5000);
		expect(() => cache.clear()).not.toThrow();
		expect(cache.get()).toBeNull();
	});
});

describe("Cache: TTL variations", () => {
	const { advanceTime } = setupTimeMock();

	it("works with very short TTL", () => {
		const cache = new Cache<string>(100);
		cache.set("test");

		advanceTime(100);
		expect(cache.get()).toBe("test"); // <= TTL valid

		advanceTime(1);
		expect(cache.get()).toBeNull();
	});

	it("handles exact TTL boundary (<= valid, > expired)", () => {
		const cache = new Cache<string>(5000);
		cache.set("test");

		advanceTime(5000);
		expect(cache.get()).toBe("test"); // exactly TTL → valid

		advanceTime(1);
		expect(cache.get()).toBeNull(); // TTL + 1 → expired
	});

	it("works with very long TTL", () => {
		const cache = new Cache<string>(1_000_000);
		cache.set("test");

		advanceTime(1_000_000);
		expect(cache.get()).toBe("test");

		advanceTime(1);
		expect(cache.get()).toBeNull();
	});
});

describe("Cache: stale", () => {
	const { advanceTime } = setupTimeMock();

	it("returns null when cache is empty", () => {
		expect(new Cache<string>(5000).stale()).toBeNull();
	});

	it("returns the value after TTL expires", () => {
		const cache = new Cache<string>(5000);
		cache.set("test data");

		advanceTime(5001);
		expect(cache.get()).toBeNull();
		expect(cache.stale()).toBe("test data");
	});

	it("returns null after clear", () => {
		const cache = new Cache<string>(5000);
		cache.set("test data");
		cache.clear();
		expect(cache.stale()).toBeNull();
	});
});
