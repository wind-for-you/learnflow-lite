import type { TrackConfig } from '../../../lib/server/types';
import { techSelfTaughtTrack } from './tech-self-taught';

export const trackConfigs: Record<string, TrackConfig> = {
  'tech-self-taught': techSelfTaughtTrack,
};

export function getTrackConfig(trackId: string): TrackConfig | null {
  return trackConfigs[trackId] || null;
}

export function getAllTrackIds(): string[] {
  return Object.keys(trackConfigs);
}
