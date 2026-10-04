'use client';
import Raster from './Raster';
import {UiSurface} from './UiArt';
export const BARN_CABINET='./assets/barn-bonus-cabinet-v20.webp';
// Only the straight posts extend. The arched crest and feet keep their proportions.
export default function BarnCabinet(){return <><Raster src={BARN_CABINET} rect={[0,0,1122,1402]} verticalSlice={[350,275]} className="feature-backdrop barn-cabinet"/><UiSurface kind="panel" className="feature-backdrop barn-compact-frame"/></>;}
