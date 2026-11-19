import { PlaceSuggestion } from './city-query';

export type SavedPlace = Omit<PlaceSuggestion, 'id'> & { id: string };
