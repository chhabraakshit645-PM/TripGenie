import type { TravelPreference, TripInterest } from '../types/trip';

export interface CuratedDestination {
  id: string;
  name: string;
  region: string;
  tagline: string;
  idealFor: string;
  suggestedDays: number;
  suggestedBudgetInr: number;
  defaultPreference: TravelPreference;
  defaultInterests: TripInterest[];
  imageUrl: string;
  imageAlt: string;
}

export const CURATED_DESTINATIONS: CuratedDestination[] = [
  {
    id: 'goa',
    name: 'Goa',
    region: 'Konkan Coast',
    tagline: 'Palm-fringed beaches, fort sunsets, scooter trails, and vibrant shack culture.',
    idealFor: 'Friend groups & beach breaks',
    suggestedDays: 4,
    suggestedBudgetInr: 16000,
    defaultPreference: 'Budget',
    defaultInterests: ['Beaches', 'Food', 'Nightlife', 'Sightseeing'],
    imageUrl: '/src/assets/images/dest_goa_coast_1794765341519.jpg',
    imageAlt: 'Golden hour view of palm trees and fishing boats on a South Goa beach',
  },
  {
    id: 'manali',
    name: 'Manali',
    region: 'Himachal Pradesh',
    tagline: 'Pine forests, river cafes in Old Manali, mountain passes, and hostel bonfires.',
    idealFor: 'Mountain treks & snow views',
    suggestedDays: 5,
    suggestedBudgetInr: 18000,
    defaultPreference: 'Budget',
    defaultInterests: ['Adventure', 'Nature', 'Food', 'Sightseeing'],
    imageUrl: '/src/assets/images/dest_manali_peaks_1794765342245.jpg',
    imageAlt: 'Snow-capped Himalayan peaks and river valley in Manali',
  },
  {
    id: 'jaipur',
    name: 'Jaipur',
    region: 'Rajasthan',
    tagline: 'Rose-pink palaces, hilltop forts, bustling bazaars, and iconic Rajasthani thalis.',
    idealFor: 'Heritage, culture & street food',
    suggestedDays: 3,
    suggestedBudgetInr: 11000,
    defaultPreference: 'Standard',
    defaultInterests: ['Sightseeing', 'Shopping', 'Food'],
    imageUrl: '/src/assets/images/dest_jaipur_palace_1794765342299.jpg',
    imageAlt: 'Rose sandstone facade of Hawa Mahal in Jaipur at sunrise',
  },
  {
    id: 'rishikesh',
    name: 'Rishikesh',
    region: 'Uttarakhand',
    tagline: 'Ganga river rafting, riverside cafes, suspension bridges, and forest waterfalls.',
    idealFor: 'Weekend adventure & detox',
    suggestedDays: 3,
    suggestedBudgetInr: 9500,
    defaultPreference: 'Budget',
    defaultInterests: ['Adventure', 'Nature', 'Sightseeing'],
    imageUrl: '/src/assets/images/dest_rishikesh_river_1794765342744.jpg',
    imageAlt: 'Emerald Ganga river flowing through forested hills in Rishikesh',
  },
];

export const HERO_IMAGE_URL = '/src/assets/images/hero_india_adventure_1794765340771.jpg';
