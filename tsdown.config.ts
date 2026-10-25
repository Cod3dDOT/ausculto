/*
 * SPDX-FileCopyrightText: 2026 cod3ddot@proton.me
 *
 * SPDX-License-Identifier: MIT
 */

import { defineConfig } from "tsdown";

export default defineConfig({
	dts: true,
	entry: "src/index.ts",
	platform: "node",
	target: "node22"
});
