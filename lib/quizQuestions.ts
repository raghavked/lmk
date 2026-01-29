// lib/quizQuestions.ts

export interface QuizOption {
  id: string;
  label: string;
  icon: string;
  tags: {
    restaurants?: string[];
    movies?: string[];
    tv_shows?: string[];
    youtube_videos?: string[];
    reading?: string[];
    activities?: string[];
    lifestyle?: string[];
  };
}

export interface QuizQuestion {
  id: string;
  question: string;
  emoji: string;
  category: 'lifestyle' | 'dining' | 'movies' | 'tv_shows' | 'youtube' | 'reading' | 'activities' | 'meta';
  stage: 1 | 2 | 3; // New field for 3-stage structure
  options: QuizOption[];
  // Adaptive logic: nextQuestionId is a function that takes the selected option ID
  // and returns the ID of the next question, or null/undefined to proceed sequentially.
  nextQuestionId?: (selectedOptionId: string) => string | undefined;
}

// --- STAGE 1: QUICK TASTE SCAN (5 Questions) ---
// Focus: Broad, high-level preferences and immediate mood.
const STAGE_1_QUESTIONS: QuizQuestion[] = [
  {
    id: 's1_mood',
    question: "What's your current mood for discovery?",
    emoji: '🧭',
    category: 'meta',
    stage: 1,
    options: [
      { id: 's1_mood_chill', label: 'Chill & Cozy', icon: '🛋️', tags: { lifestyle: ['Relaxed', 'Cozy', 'Low-Energy'] } },
      { id: 's1_mood_adventure', label: 'Excited & Adventurous', icon: '🚀', tags: { lifestyle: ['High-Energy', 'Adventurous', 'Spontaneous'] } },
      { id: 's1_mood_learn', label: 'Curious & Thoughtful', icon: '🧠', tags: { lifestyle: ['Intellectual', 'Thoughtful', 'Educational'] } },
      { id: 's1_mood_social', label: 'Social & Lively', icon: '🎉', tags: { lifestyle: ['Social', 'Lively', 'Extroverted'] } },
    ],
  },
  {
    id: 's1_pace',
    question: "When you go out, do you prefer a fast pace or a slow burn?",
    emoji: '⏱️',
    category: 'lifestyle',
    stage: 1,
    options: [
      { id: 's1_pace_fast', label: 'Fast-Paced & Efficient', icon: '⚡', tags: { lifestyle: ['Fast-Paced', 'Efficient', 'Quick'] } },
      { id: 's1_pace_slow', label: 'Slow & Leisurely', icon: '🐌', tags: { lifestyle: ['Slow', 'Leisurely', 'Mindful'] } },
    ],
  },
  {
    id: 's1_cuisine',
    question: "Pick a flavor profile that always hits the spot.",
    emoji: '👅',
    category: 'dining',
    stage: 1,
    options: [
      { id: 's1_cuisine_spicy', label: 'Spicy & Bold', icon: '🌶️', tags: { restaurants: ['Spicy', 'Bold Flavors', 'Mexican', 'Thai'] } },
      { id: 's1_cuisine_umami', label: 'Umami & Savory', icon: '🍄', tags: { restaurants: ['Umami', 'Savory', 'Japanese', 'Italian'] } },
      { id: 's1_cuisine_sweet', label: 'Sweet & Comforting', icon: '🍰', tags: { restaurants: ['Dessert', 'Comfort Food', 'Sweet'] } },
      { id: 's1_cuisine_fresh', label: 'Fresh & Bright', icon: '🍋', tags: { restaurants: ['Fresh', 'Bright Flavors', 'Seafood', 'Mediterranean'] } },
    ],
  },
  {
    id: 's1_media',
    question: "Which type of story draws you in the most?",
    emoji: '🎬',
    category: 'movies',
    stage: 1,
    options: [
      { id: 's1_media_real', label: 'Grounded in Reality (Drama, Doc)', icon: '🌍', tags: { movies: ['Drama', 'Realistic'], tv_shows: ['Documentary', 'True Crime'] } },
      { id: 's1_media_fantasy', label: 'Escapist Fantasy (Sci-Fi, Magic)', icon: '✨', tags: { movies: ['Fantasy', 'Sci-Fi'], tv_shows: ['World-Building', 'High Concept'] } },
      { id: 's1_media_thrill', label: 'High-Stakes Thriller (Action, Mystery)', icon: '💥', tags: { movies: ['Action', 'Thriller'], tv_shows: ['Suspense', 'Mystery'] } },
      { id: 's1_media_comedy', label: 'Pure Comedy & Fun', icon: '😂', tags: { movies: ['Comedy', 'Lighthearted'], tv_shows: ['Sitcom', 'Humor'] } },
    ],
  },
  {
    id: 's1_activity',
    question: "When you have free time, what's your default setting?",
    emoji: '🎯',
    category: 'activities',
    stage: 1,
    options: [
      { id: 's1_activity_home', label: 'Homebody (Cozy & Indoor)', icon: '🏠', tags: { activities: ['Indoor', 'Home', 'Relaxing'] } },
      { id: 's1_activity_culture', label: 'Cultural (Museums, Shows)', icon: '🖼️', tags: { activities: ['Culture', 'Art', 'Museums'] } },
      { id: 's1_activity_nature', label: 'Nature (Hikes, Parks)', icon: '🌲', tags: { activities: ['Nature', 'Outdoors', 'Hiking'] } },
      { id: 's1_activity_city', label: 'City Explorer (Shopping, Cafes)', icon: '🏙️', tags: { activities: ['City', 'Shopping', 'Urban'] } },
    ],
  },
];

// --- STAGE 2: SCENARIO-BASED QUESTIONS (8 Questions) ---
// Focus: Deeper, context-specific preferences, often with adaptive follow-up.
const STAGE_2_QUESTIONS: QuizQuestion[] = [
  {
    id: 's2_friday_night',
    question: "It's Friday night, you're tired, and you're ordering takeout. What's the vibe?",
    emoji: '😴',
    category: 'dining',
    stage: 2,
    options: [
      { id: 's2_friday_comfort', label: 'Comfort Food & Nostalgia', icon: '🍕', tags: { restaurants: ['Comfort Food', 'Nostalgia', 'Casual'], lifestyle: ['Cozy'] } },
      { id: 's2_friday_healthy', label: 'Healthy & Fresh Reset', icon: '🥗', tags: { restaurants: ['Healthy', 'Fresh', 'Clean Eating'], lifestyle: ['Mindful'] } },
      { id: 's2_friday_exotic', label: 'Exotic & Adventurous', icon: '🍜', tags: { restaurants: ['Exotic', 'Adventurous', 'Fusion'], lifestyle: ['Spontaneous'] } },
      { id: 's2_friday_fancy', label: 'Prestige & Treat Yourself', icon: '🥂', tags: { restaurants: ['Fine Dining (Takeout)', 'Luxury', 'Treat'], lifestyle: ['Luxury'] } },
    ],
  },
  {
    id: 's2_movie_length',
    question: "You're starting a movie. How long is too long?",
    emoji: '⏳',
    category: 'movies',
    stage: 2,
    options: [
      { id: 's2_movie_short', label: 'Under 90 mins (Quick Hit)', icon: '⏱️', tags: { movies: ['Short', 'Efficient'], tv_shows: ['Short Episodes'] } },
      { id: 's2_movie_standard', label: '90 - 150 mins (Standard)', icon: '🍿', tags: { movies: ['Standard Length'] } },
      { id: 's2_movie_epic', label: 'Over 150 mins (The Longer the Better)', icon: '🎬', tags: { movies: ['Epic', 'Long-Form', 'Saga'] } },
    ],
  },
  {
    id: 's2_tv_genre',
    question: "What's the one TV genre you'll always give a chance?",
    emoji: '📺',
    category: 'tv_shows',
    stage: 2,
    options: [
      { id: 's2_tv_prestige', label: 'Prestige Drama (HBO/Netflix style)', icon: '🏆', tags: { tv_shows: ['Prestige TV', 'Drama', 'High Production'] } },
      { id: 's2_tv_procedural', label: 'Comfort Procedural (Crime/Medical)', icon: '🚨', tags: { tv_shows: ['Procedural', 'Episodic', 'Comfort Watch'] } },
      { id: 's2_tv_sitcom', label: 'Classic Sitcom (Laugh Track/Multi-cam)', icon: '🤣', tags: { tv_shows: ['Sitcom', 'Comedy', 'Nostalgia'] } },
      { id: 's2_tv_reality', label: 'Competition Reality (Cooking/Survival)', icon: '🏅', tags: { tv_shows: ['Reality', 'Competition', 'Unscripted'] } },
    ],
  },
  {
    id: 's2_youtube_topic',
    question: "Which YouTube rabbit hole are you most likely to fall down?",
    emoji: '🕳️',
    category: 'youtube',
    stage: 2,
    options: [
      { id: 's2_youtube_explain', label: 'Deep Explanations (History, Science)', icon: '🔬', tags: { youtube_videos: ['Educational', 'Science', 'History', 'Long-Form'] } },
      { id: 's2_youtube_craft', label: 'Creative Process (Art, Music, Design)', icon: '🎨', tags: { youtube_videos: ['Creative', 'Art', 'Design', 'Process'] } },
      { id: 's2_youtube_gaming', label: 'Gaming & Streaming Highlights', icon: '🎮', tags: { youtube_videos: ['Gaming', 'Streaming', 'Esports'] } },
      { id: 's2_youtube_vlog', label: 'Lifestyle Vlogs & Day-in-the-Life', icon: '🤳', tags: { youtube_videos: ['Vlog', 'Lifestyle', 'Travel'] } },
    ],
  },
  {
    id: 's2_reading_format',
    question: "When you read, what format is your go-to?",
    emoji: '📚',
    category: 'reading',
    stage: 2,
    options: [
      { id: 's2_reading_book', label: 'Physical Book (Fiction/Non-Fiction)', icon: '📖', tags: { reading: ['Book', 'Long-Form', 'Fiction', 'Non-Fiction'] } },
      { id: 's2_reading_article', label: 'Long-Form Articles (The Atlantic, NYT)', icon: '📰', tags: { reading: ['Article', 'Journalism', 'Current Events'] } },
      { id: 's2_reading_comic', label: 'Graphic Novels & Comics', icon: '🦸', tags: { reading: ['Graphic Novel', 'Comic', 'Visual Storytelling'] } },
      { id: 's2_reading_audio', label: 'Audiobooks & Podcasts', icon: '🎧', tags: { reading: ['Audio', 'Podcast', 'Listening'] } },
    ],
  },
  {
    id: 's2_activity_social',
    question: "When planning a group activity, what's your priority?",
    emoji: '🤝',
    category: 'activities',
    stage: 2,
    options: [
      { id: 's2_activity_easy', label: 'Low-Effort & Easy to Organize', icon: '✅', tags: { activities: ['Low-Effort', 'Casual', 'Simple'] } },
      { id: 's2_activity_unique', label: 'Unique & Memorable Experience', icon: '🌟', tags: { activities: ['Unique', 'Memorable', 'Novelty'] } },
      { id: 's2_activity_active', label: 'Physically Active & Competitive', icon: '💪', tags: { activities: ['Active', 'Competitive', 'Sports'] } },
      { id: 's2_activity_food', label: 'Centered Around Food/Drink', icon: '🍻', tags: { activities: ['Food-Focused', 'Social', 'Drinks'] } },
    ],
  },
  {
    id: 's2_adapt_tech',
    question: "You just bought a new gadget. Do you read the manual or just start using it?",
    emoji: '⚙️',
    category: 'meta',
    stage: 2,
    nextQuestionId: (selected) => selected === 's2_adapt_manual' ? 's3_detail_tech' : undefined,
    options: [
      { id: 's2_adapt_manual', label: 'Read the Manual (Detail-Oriented)', icon: '📝', tags: { lifestyle: ['Detail-Oriented', 'Planner', 'Analytical'] } },
      { id: 's2_adapt_use', label: 'Just Start Using It (Trial & Error)', icon: '🚀', tags: { lifestyle: ['Spontaneous', 'Trial-and-Error', 'Intuitive'] } },
    ],
  },
  {
    id: 's2_adapt_social',
    question: "When meeting new people, are you more of a listener or a talker?",
    emoji: '🗣️',
    category: 'meta',
    stage: 2,
    nextQuestionId: (selected) => selected === 's2_adapt_listener' ? 's3_detail_social' : undefined,
    options: [
      { id: 's2_adapt_listener', label: 'Listener (Observant & Reflective)', icon: '👂', tags: { lifestyle: ['Introvert', 'Observant', 'Reflective'] } },
      { id: 's2_adapt_talker', label: 'Talker (Engaging & Outgoing)', icon: '📣', tags: { lifestyle: ['Extrovert', 'Engaging', 'Outgoing'] } },
    ],
  },
];

// --- STAGE 3: FINE-GRAINED CONTROLS (10 Questions) ---
// Focus: Sliders and multi-selects for nuanced data collection.
const STAGE_3_QUESTIONS: QuizQuestion[] = [
  // Adaptive Follow-up 1 (from s2_adapt_tech)
  {
    id: 's3_detail_tech',
    question: "Since you like details: How important is the *origin story* of a product/place?",
    emoji: '📜',
    category: 'meta',
    stage: 3,
    options: [
      { id: 's3_detail_tech_high', label: 'Very Important (History, Provenance)', icon: '👑', tags: { lifestyle: ['Provenance', 'History', 'Authenticity'] } },
      { id: 's3_detail_tech_low', label: 'Not Important (Just care about function)', icon: '⚙️', tags: { lifestyle: ['Functional', 'Pragmatic'] } },
    ],
  },
  // Adaptive Follow-up 2 (from s2_adapt_social)
  {
    id: 's3_detail_social',
    question: "Since you're a listener: Do you prefer places with a clear 'scene' or a mix of people?",
    emoji: '🎭',
    category: 'lifestyle',
    stage: 3,
    options: [
      { id: 's3_detail_social_scene', label: 'Clear Scene (Hipster, Corporate, etc.)', icon: '🕶️', tags: { lifestyle: ['Niche', 'Scene', 'Exclusive'] } },
      { id: 's3_detail_social_mix', label: 'Diverse Mix (All types of people)', icon: '🤝', tags: { lifestyle: ['Diverse', 'Inclusive', 'Broad Appeal'] } },
    ],
  },
  // General Fine-Grained Questions
  {
    id: 's3_slider_price',
    question: "Price Sensitivity: How much does cost factor into your decision?",
    emoji: '💰',
    category: 'meta',
    stage: 3,
    options: [
      { id: 's3_slider_price_low', label: 'Value-Focused', icon: '💸', tags: { lifestyle: ['Budget-Conscious', 'Value'] } },
      { id: 's3_slider_price_high', label: 'Quality-Focused', icon: '💎', tags: { lifestyle: ['Luxury', 'Quality-First'] } },
    ],
  },
  {
    id: 's3_slider_noise',
    question: "Noise Level: Do you prefer quiet or lively environments?",
    emoji: '🔊',
    category: 'dining',
    stage: 3,
    options: [
      { id: 's3_slider_noise_quiet', label: 'Quiet & Intimate', icon: '🤫', tags: { restaurants: ['Quiet', 'Intimate'], activities: ['Relaxing'] } },
      { id: 's3_slider_noise_lively', label: 'Lively & Buzzing', icon: '🥳', tags: { restaurants: ['Lively', 'Buzzing'], activities: ['Social'] } },
    ],
  },
  {
    id: 's3_slider_risk',
    question: "Risk Tolerance: How often do you try something completely new?",
    emoji: '🎲',
    category: 'meta',
    stage: 3,
    options: [
      { id: 's3_slider_risk_low', label: 'Stick to what I know', icon: '✅', tags: { lifestyle: ['Predictable', 'Familiar'] } },
      { id: 's3_slider_risk_high', label: 'Always try the wild card', icon: '🤯', tags: { lifestyle: ['Adventurous', 'Novelty'] } },
    ],
  },
  {
    id: 's3_multi_art',
    question: "Select all that apply: What kind of art/design appeals to you?",
    emoji: '🎨',
    category: 'meta',
    stage: 3,
    options: [
      { id: 's3_multi_art_modern', label: 'Modern & Abstract', icon: '🔳', tags: { lifestyle: ['Modern', 'Abstract'], activities: ['Art Gallery'] } },
      { id: 's3_multi_art_classic', label: 'Classical & Renaissance', icon: '🏛️', tags: { lifestyle: ['Classic', 'Historical'], activities: ['Museum'] } },
      { id: 's3_multi_art_street', label: 'Street Art & Graffiti', icon: ' aerosol', tags: { lifestyle: ['Urban', 'Edgy'], activities: ['Street Art Tour'] } },
      { id: 's3_multi_art_nature', label: 'Nature Photography & Landscape', icon: '📸', tags: { lifestyle: ['Nature', 'Photography'], activities: ['Nature'] } },
    ],
  },
  {
    id: 's3_multi_tech',
    question: "Select all that apply: What kind of technology interests you?",
    emoji: '💻',
    category: 'meta',
    stage: 3,
    options: [
      { id: 's3_multi_tech_ai', label: 'AI & Machine Learning', icon: '🤖', tags: { youtube_videos: ['AI', 'Tech'], reading: ['Science', 'Future'] } },
      { id: 's3_multi_tech_space', label: 'Space & Astronomy', icon: '🚀', tags: { movies: ['Sci-Fi', 'Space'], reading: ['Science'] } },
      { id: 's3_multi_tech_gaming', label: 'Console & PC Gaming', icon: '🎮', tags: { youtube_videos: ['Gaming'], lifestyle: ['Gaming'] } },
      { id: 's3_multi_tech_bio', label: 'Biotech & Health', icon: '🧬', tags: { reading: ['Health', 'Science'], lifestyle: ['Mindful'] } },
    ],
  },
  {
    id: 's3_multi_food',
    question: "Select all that apply: What kind of food experience do you enjoy?",
    emoji: '🍽️',
    category: 'dining',
    stage: 3,
    options: [
      { id: 's3_multi_food_street', label: 'Street Food & Food Trucks', icon: '🚚', tags: { restaurants: ['Street Food', 'Casual', 'Value'] } },
      { id: 's3_multi_food_omakase', label: 'Omakase & Tasting Menus', icon: '🍣', tags: { restaurants: ['Omakase', 'Tasting Menu', 'Luxury'] } },
      { id: 's3_multi_food_brunch', label: 'Brunch & Breakfast Spots', icon: '🍳', tags: { restaurants: ['Brunch', 'Breakfast', 'Casual'] } },
      { id: 's3_multi_food_vegan', label: 'Plant-Based & Vegan', icon: '🌱', tags: { restaurants: ['Vegan', 'Plant-Based', 'Healthy'] } },
    ],
  },
  {
    id: 's3_multi_movie',
    question: "Select all that apply: What kind of movie tone do you seek?",
    emoji: '🎭',
    category: 'movies',
    stage: 3,
    options: [
      { id: 's3_multi_movie_oscar', label: 'Oscar Bait & Prestige', icon: '🏆', tags: { movies: ['Prestige', 'Oscar', 'Drama'] } },
      { id: 's3_multi_movie_indie', label: 'Indie & Arthouse', icon: '📽️', tags: { movies: ['Indie', 'Arthouse', 'Experimental'] } },
      { id: 's3_multi_movie_horror', label: 'Horror & Suspense', icon: '👻', tags: { movies: ['Horror', 'Suspense', 'Thriller'] } },
      { id: 's3_multi_movie_musical', label: 'Musical & Dance', icon: '🎶', tags: { movies: ['Musical', 'Dance', 'Uplifting'] } },
    ],
  },
  {
    id: 's3_multi_activity',
    question: "Select all that apply: What kind of activity appeals to you?",
    emoji: '🤸',
    category: 'activities',
    stage: 3,
    options: [
      { id: 's3_multi_activity_live', label: 'Live Music & Concerts', icon: '🎤', tags: { activities: ['Music', 'Concert', 'Lively'] } },
      { id: 's3_multi_activity_sport', label: 'Watching Live Sports', icon: '🏈', tags: { activities: ['Sports', 'Competitive', 'Social'] } },
      { id: 's3_multi_activity_spa', label: 'Spa & Wellness', icon: '🧖', tags: { activities: ['Wellness', 'Relaxing', 'Mindful'] } },
      { id: 's3_multi_activity_game', label: 'Board Games & Arcades', icon: '🎲', tags: { activities: ['Gaming', 'Indoor', 'Social'] } },
    ],
  },
];

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  ...STAGE_1_QUESTIONS,
  ...STAGE_2_QUESTIONS,
  ...STAGE_3_QUESTIONS,
];

// Helper to get the next question ID based on the current question and selected option
export function getNextQuestionId(currentQuestionId: string, selectedOptionId: string): string | undefined {
  const currentQuestion = QUIZ_QUESTIONS.find(q => q.id === currentQuestionId);
  if (currentQuestion?.nextQuestionId) {
    return currentQuestion.nextQuestionId(selectedOptionId);
  }
  return undefined;
}

// Helper to get the next sequential question
export function getNextSequentialQuestion(currentQuestionId: string): QuizQuestion | undefined {
  const currentIndex = QUIZ_QUESTIONS.findIndex(q => q.id === currentQuestionId);
  return QUIZ_QUESTIONS[currentIndex + 1];
}

// Helper to get all questions for a specific stage
export function getQuestionsByStage(stage: 1 | 2 | 3): QuizQuestion[] {
  return QUIZ_QUESTIONS.filter(q => q.stage === stage);
}
