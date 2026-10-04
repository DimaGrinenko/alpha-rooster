// CSS and the event player use the same wall-time envelopes. The award may
// resolve only after the last prize reaches the collector, including turbo.
export const COLLECT_TIMING={departure:260,columnGap:165,landing:480,flight:740,flightStagger:35,arrivalHold:80,winHold:700,missHold:650} as const;
export function collectionFlightDuration(eggs:number){return COLLECT_TIMING.flight+Math.max(0,eggs-1)*COLLECT_TIMING.flightStagger+COLLECT_TIMING.arrivalHold;}
