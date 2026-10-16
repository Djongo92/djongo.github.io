#!/usr/bin/env node
// Regenerates artifacts/legalos-mobile/data/chapters.ts from the web guidebook
// (the single source of truth). Run with tsx:
//   pnpm --filter @workspace/legalos run generate:mobile-chapters
// Parity is enforced by src/lib/mobileChaptersParity.test.ts — if the mobile
// file drifts from this projection, the web test suite fails.
import { writeFileSync } from "node:fs";
import { chapters } from "../src/data/chapters.ts";
import { projectMobileChapters } from "../src/lib/mobileChapterProjection.ts";

const target = new URL("../../legalos-mobile/data/chapters.ts", import.meta.url);
writeFileSync(target, projectMobileChapters(chapters));
console.log(`generate-mobile-chapters: wrote ${chapters.length} chapters to ${target.pathname}`);
