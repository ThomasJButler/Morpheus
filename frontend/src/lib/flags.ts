// The v2 shell is the product now; the flag only exists to fall back to the
// legacy single-column layout by setting NEXT_PUBLIC_REDESIGN_V2=false.
export const REDESIGN_V2 = process.env.NEXT_PUBLIC_REDESIGN_V2 !== 'false';
