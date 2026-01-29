// scripts/test_airanker.ts

import { AIRanker } from '../lib/ai/ranker';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Mock user data with the new taste profile structure
const mockUser = {
  id: 'test-user-123',
  full_name: 'Manus Test User',
  location: { city: 'San Francisco', coordinates: [37.7749, -122.4194] },
  // This is the new, expanded taste profile structure
  taste_profile: [
    {
      category: 'restaurants',
      tags: [
        { tag: 'Fine Dining', weight: 2.0 },
        { tag: 'Japanese', weight: 1.8 },
        { tag: 'Artistry', weight: 1.9 },
        { tag: 'Quiet', weight: 1.5 },
        { tag: 'Luxury', weight: 1.7 },
      ],
      last_computed: new Date().toISOString(),
    },
    {
      category: 'movies',
      tags: [
        { tag: 'Sci-Fi', weight: 2.0 },
        { tag: 'World-Building', weight: 2.2 },
        { tag: 'High Concept', weight: 1.9 },
        { tag: 'Slow-Burn', weight: 1.5 },
        { tag: 'Dark', weight: 1.6 },
      ],
      last_computed: new Date().toISOString(),
    },
    // ... other categories would be here
  ],
};

// Mock objects for ranking
const mockObjects = [
  {
    id: 'obj-1',
    title: 'Omakase by Toshi',
    category: 'restaurants',
    description: 'An intimate, 8-seat sushi counter known for its meticulous preparation and rare fish selection.',
    tags: ['Sushi', 'Omakase', 'Japanese', 'Intimate', 'Expensive'],
    external_ratings: [{ source: 'Yelp', score: 4.9, count: 500 }],
    location: { coordinates: [37.7755, -122.4180] }, // Very close
  },
  {
    id: 'obj-2',
    title: 'The Galaxy\'s Edge',
    category: 'movies',
    description: 'A sprawling, 3-hour sci-fi epic about a lone traveler navigating a post-apocalyptic, technologically advanced world.',
    tags: ['Sci-Fi', 'Epic', 'Post-Apocalyptic', 'VFX', 'High Concept'],
    external_ratings: [{ source: 'TMDB', score: 8.7, count: 15000 }],
  },
  {
    id: 'obj-3',
    title: 'Joe\'s Burger Shack',
    category: 'restaurants',
    description: 'A loud, casual spot for quick, greasy burgers and fries. Known for its cheap prices and fast service.',
    tags: ['Burger', 'Casual', 'Cheap', 'Fast Food'],
    external_ratings: [{ source: 'Google', score: 4.2, count: 10000 }],
    location: { coordinates: [37.7800, -122.4500] }, // A bit further
  },
];

async function testAIRanker() {
  console.log('--- Testing AIRanker with Intelligent Metrics Requirement ---');
  
  const ranker = new AIRanker();
  
  // Test 1: Restaurant Ranking
  console.log('\n--- Test 1: Restaurant Ranking (Focus: Fine Dining, Japanese, Artistry) ---');
  const restaurantContext = {
    category: 'restaurants',
    location: { lat: 37.7749, lng: -122.4194 },
    mode: 'feed' as const,
  };
  
  const restaurantResults = await ranker.rank(
    mockObjects.filter(o => o.category === 'restaurants'),
    mockUser,
    restaurantContext
  );
  
  console.log('Found ' + restaurantResults.length + ' results.');
  restaurantResults.forEach(r => {
    console.log('\nRank: ' + r.rank + ' | Score: ' + r.personalized_score);
    console.log('Title: ' + r.object.title);
    console.log('Tagline: ' + r.explanation?.tagline);
    console.log('Detailed Ratings:');
    console.log(r.explanation?.detailed_ratings);
  });

  // Test 2: Movie Ranking
  console.log('\n--- Test 2: Movie Ranking (Focus: Sci-Fi, World-Building, Dark) ---');
  const movieContext = {
    category: 'movies',
    mode: 'feed' as const,
  };
  
  const movieResults = await ranker.rank(
    mockObjects.filter(o => o.category === 'movies'),
    mockUser,
    movieContext
  );
  
  console.log('Found ' + movieResults.length + ' results.');
  movieResults.forEach(r => {
    console.log('\nRank: ' + r.rank + ' | Score: ' + r.personalized_score);
    console.log('Title: ' + r.object.title);
    console.log('Tagline: ' + r.explanation?.tagline);
    console.log('Detailed Ratings:');
    console.log(r.explanation?.detailed_ratings);
  });
}

testAIRanker();
