import { techSelfTaughtTrack, type TrackConfig } from './tech-self-taught';

export const availableTracks: TrackConfig[] = [techSelfTaughtTrack];

export function getTrackById(trackId: string): TrackConfig | undefined {
  return availableTracks.find((track) => track.id === trackId);
}

export type { TrackConfig, OnboardingQuestion } from './tech-self-taught';
