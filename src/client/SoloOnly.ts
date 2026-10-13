// Build-time switch for the solo-only build. Vite defines
// process.env.SOLO_ONLY (vite.config.ts): on unless SOLO_ONLY=false is set.
export const SOLO_ONLY: boolean = process.env.SOLO_ONLY !== "false";
