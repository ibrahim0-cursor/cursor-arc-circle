import { SAVED_SCANS_MAX } from "./birdeye-policy";

/** Live feed: fixed roster size — same tokens refresh in place (prices/signals update) */
export const STABLE_FEED_LIMIT = 15;

/** Memory scan: deep archive saved to Agent Memory tab */
export const MEMORY_SCAN_LIMIT = SAVED_SCANS_MAX;

/** Max decisions kept in Saved scans tab + localStorage */
export { SAVED_SCANS_MAX };

/** Alpha scan: ranked opportunities (tuned for Vercel ~120s limit) */
export const ALPHA_SCAN_LIMIT = 12;

/** GMGN fresh launches merged into Live Feed (not Alpha universe) */
export const FEED_DISCOVERY_GMGN_LIMIT = 10;

/** Alpha list should not duplicate Live Feed names (paid desk = unique picks) */
export const ALPHA_MAX_LIVE_OVERLAP = 0;
