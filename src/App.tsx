import { useState, useCallback, useMemo } from 'react';

// ============================================================
// CONFIG — read from URL params for white-labeling
// ============================================================
function getConfig() {
  const params = new URLSearchParams(window.location.search);
  return {
    agentName: params.get('agent') || 'Your Disney Travel Expert',
    primaryColor: params.get('primary') || '#7B2D8E',
    accentColor: params.get('accent') || '#E91E8C',
    goldColor: params.get('gold') || '#F5A623',
    logo: params.get('logo') || '',
    webhookUrl: params.get('webhook') || '',
    ctaUrl: params.get('cta') || '',
    ctaText: params.get('ctaText') || 'Get My Free Custom Quote',
    embedded: params.get('embed') === '1',
  };
}

// ============================================================
// TYPES
// ============================================================
interface QuizOption {
  text: string;
  value: string;
  desc?: string;
}

interface QuizQuestion {
  id: string;
  question: string;
  subtext?: string;
  options: QuizOption[];
  multi?: boolean;
  maxSelect?: number;
  condition?: (a: Record<string, string | string[]>) => boolean;
}

interface QuizResult {
  product: string;
  tagline: string;
  whyFit: string;
  price: string;
  bestFor: string;
  proTip: string;
  timing: string;
  category: 'resort' | 'cruise' | 'adventure' | 'beach';
}

// ============================================================
// QUESTION DATA
// ============================================================
const QUESTIONS: QuizQuestion[] = [
  // ---- UNIVERSAL (everyone answers) ----
  {
    id: 'vacation_type',
    question: "What kind of vacation are you dreaming about?",
    options: [
      { text: "Theme parks & resorts", value: "parks", desc: "Rides, characters, fireworks — the full Disney experience" },
      { text: "A cruise", value: "cruise", desc: "Ocean, beautiful ports, and Disney magic at sea" },
      { text: "A guided adventure", value: "adventure", desc: "Exploring new countries and cultures with Disney or Nat Geo" },
      { text: "Beach & relaxation", value: "beach", desc: "Pools, ocean, and a slower pace with a Disney touch" },
    ]
  },
  {
    id: 'party_type',
    question: "Who's coming along on this trip?",
    options: [
      { text: "Just us — couple or solo", value: "couple" },
      { text: "Family with young kids (under 8)", value: "young_family" },
      { text: "Family with tweens/teens (8-17)", value: "teen_family" },
      { text: "Family with mixed ages", value: "mixed_family" },
      { text: "Multi-generational or big group", value: "multi_gen" },
    ]
  },
  {
    id: 'group_size',
    question: "How many people total?",
    options: [
      { text: "2 people", value: "2" },
      { text: "3-4 people", value: "3-4" },
      { text: "5-6 people", value: "5-6" },
      { text: "7-9 people", value: "7-9" },
      { text: "10+ people", value: "10+" },
    ]
  },
  {
    id: 'kids_ages',
    question: "What ages are the kids?",
    subtext: "Select all that apply",
    multi: true,
    maxSelect: 4,
    condition: (a) => a.party_type !== 'couple',
    options: [
      { text: "Babies/toddlers (0-3)", value: "toddlers" },
      { text: "Little ones (4-7)", value: "little" },
      { text: "Tweens (8-12)", value: "tweens" },
      { text: "Teenagers (13-17)", value: "teens" },
    ]
},
  {
    id: 'season',
    question: "What time of year are you thinking?",
    options: [
      { text: "Spring (Mar-May)", value: "spring", desc: "Lighter crowds, nice weather" },
      { text: "Summer (Jun-Aug)", value: "summer", desc: "Kids out of school" },
      { text: "Fall (Sep-Nov)", value: "fall", desc: "Halloween events, lower crowds" },
      { text: "Winter holidays (Dec-Feb)", value: "winter", desc: "Christmas magic, festive events" },
      { text: "Flexible — you tell me", value: "flexible" },
    ]
  },
  {
    id: 'budget',
    question: "What's your comfort zone for total trip budget?",
    subtext: "No judgment — this helps match you with the right tier.",
    options: [
      { text: "Under $3,000", value: "budget", desc: "Budget-friendly" },
      { text: "$3,000 - $6,000", value: "moderate", desc: "Comfortable experience" },
      { text: "$6,000 - $12,000", value: "premium", desc: "Something special" },
      { text: "$12,000 - $20,000", value: "luxury", desc: "Bucket list trip" },
      { text: "$20,000+", value: "unlimited", desc: "No compromises" },
    ]
  },
  {
    id: 'experience',
    question: "How much Disney experience does your group have?",
    options: [
      { text: "First-timers!", value: "first" },
      { text: "Been once or twice", value: "some" },
      { text: "Regular visitors", value: "regular" },
      { text: "Disney veterans — looking for something new", value: "veteran" },
    ]
  },
  {
    id: 'occasion',
    question: "Celebrating anything special?",
    options: [
      { text: "Birthday", value: "birthday" },
      { text: "Anniversary or honeymoon", value: "anniversary" },
      { text: "Graduation or milestone", value: "graduation" },
      { text: "Family reunion", value: "reunion" },
      { text: "Just because!", value: "none" },
    ]
  },
  {
    id: 'priority',
    question: "If you could pick ONE thing that matters most?",
    options: [
      { text: "Convenience — minimize stress", value: "convenience" },
      { text: "Unique experience", value: "unique" },
      { text: "Quality time together", value: "connection" },
      { text: "Adventure and excitement", value: "adventure" },
      { text: "Pure relaxation", value: "relaxation" },
    ]
  },
  {
    id: 'pace',
    question: "Describe your perfect vacation day:",
    options: [
      { text: "Up early, packed schedule, collapse happy", value: "packed" },
      { text: "Sleep in, one big thing, nice dinner", value: "relaxed" },
      { text: "Morning activities, free afternoon, evening experience", value: "balanced" },
      { text: "No plan at all — wake up and decide", value: "spontaneous" },
    ]
  },
  // ---- PARKS BRANCH ----
  {
    id: 'park_priority',
    question: "Which parks excite you most?",
    subtext: "Pick up to 2",
    multi: true,
    maxSelect: 2,
    condition: (a) => a.vacation_type === 'parks',
    options: [
      { text: "Magic Kingdom", value: "mk", desc: "Classic Disney, Cinderella Castle" },
      { text: "EPCOT", value: "epcot", desc: "World Showcase, food festivals" },
      { text: "Hollywood Studios", value: "hs", desc: "Star Wars, Toy Story Land" },
      { text: "Animal Kingdom", value: "ak", desc: "Pandora, safari, nature" },
      { text: "Disneyland (California)", value: "dl", desc: "The original park" },
    ]
  },
  {
    id: 'dining_priority',
    question: "How important is dining to your Disney experience?",
    condition: (a) => a.vacation_type === 'parks',
    options: [
      { text: "Very — character meals, signature dining, the works", value: "high" },
      { text: "Somewhat — a couple nice meals plus quick-service", value: "medium" },
      { text: "Not a priority — spend time on rides", value: "low" },
    ]
  },
  {
    id: 'resort_vibe',
    question: "When you picture your Disney resort, what feels right?",
    condition: (a) => a.vacation_type === 'parks',
    options: [
      { text: "Fun and themed — Disney icons everywhere", value: "themed" },
      { text: "Tropical and relaxing — pools, palm trees", value: "tropical" },
      { text: "Elegant and upscale — grand lobby, fine dining", value: "elegant" },
{ text: "Nature and outdoors — lodges, cabins, unique settings", value: "nature" },
      { text: "Modern and convenient — close to parks", value: "modern" },
      { text: "We want SPACE — full kitchen, multiple bedrooms", value: "villa" },
    ]
  },
  // ---- CRUISE BRANCH ----
  {
    id: 'cruise_dest',
    question: "Where do you want to sail?",
    condition: (a) => a.vacation_type === 'cruise',
    options: [
      { text: "Caribbean / Bahamas", value: "caribbean", desc: "Warm water, Castaway Cay" },
      { text: "Alaska", value: "alaska", desc: "Glaciers, whales, dramatic scenery" },
      { text: "Europe / Mediterranean", value: "europe", desc: "History, culture, beautiful ports" },
      { text: "Not sure — help me pick", value: "unsure" },
    ]
  },
  {
    id: 'cruise_length',
    question: "How long do you want to be at sea?",
    condition: (a) => a.vacation_type === 'cruise',
    options: [
      { text: "3-4 nights — short getaway", value: "short" },
      { text: "5-7 nights — the sweet spot", value: "medium" },
      { text: "8-14 nights — the full experience", value: "long" },
    ]
  },
  {
    id: 'ship_priority',
    question: "What matters most on the ship?",
    subtext: "Pick up to 2",
    multi: true,
    maxSelect: 2,
    condition: (a) => a.vacation_type === 'cruise',
    options: [
      { text: "Kids clubs & family activities", value: "kids" },
      { text: "Adult spaces — spa, quiet pools", value: "adult" },
      { text: "Entertainment — Broadway shows, parties", value: "entertainment" },
      { text: "Dining — rotational, specialty", value: "dining" },
      { text: "Ports & excursions", value: "ports" },
      { text: "Newest features & tech", value: "newest" },
    ]
  },
  {
    id: 'cabin_type',
    question: "What kind of stateroom?",
    condition: (a) => a.vacation_type === 'cruise',
    options: [
      { text: "Inside — save money for excursions", value: "inside" },
      { text: "Oceanview — a porthole", value: "oceanview" },
      { text: "Verandah — private balcony (most popular)", value: "verandah" },
      { text: "Concierge — VIP everything", value: "concierge" },
      { text: "Not sure — what do you recommend?", value: "unsure" },
    ]
  },
  // ---- ADVENTURE BRANCH ----
  {
    id: 'adventure_region',
    question: "Where in the world is calling you?",
    condition: (a) => a.vacation_type === 'adventure',
    options: [
      { text: "Europe", value: "europe", desc: "History, art, food" },
      { text: "Africa", value: "africa", desc: "Safari, wildlife" },
      { text: "Central/South America", value: "americas", desc: "Rainforest, ruins" },
      { text: "Asia/Pacific", value: "asia", desc: "Temples, cuisine" },
      { text: "I'm open — match me", value: "open" },
    ]
  },
  {
    id: 'activity_level',
    question: "How physically active do you want this trip?",
    condition: (a) => a.vacation_type === 'adventure',
    options: [
      { text: "Easy — scenic, guided tours", value: "easy" },
      { text: "Moderate — some hiking, nothing extreme", value: "moderate" },
      { text: "Active — hiking, biking, physical challenges", value: "active" },
    ]
  },
  {
    id: 'travel_style',
    question: "What kind of travel experience?",
    condition: (a) => a.vacation_type === 'adventure',
    options: [
      { text: "Fully guided — someone handles everything", value: "guided" },
      { text: "Small group expedition — expert-led, off beaten path", value: "expedition" },
      { text: "River cruise — floating hotel between destinations", value: "river" },
    ]
  },
  // ---- BEACH BRANCH ----
  {
    id: 'beach_dest',
    question: "Where's your dream beach?",
    condition: (a) => a.vacation_type === 'beach',
    options: [
      { text: "Hawaii — tropical paradise", value: "hawaii" },
      { text: "Caribbean — turquoise water, white sand", value: "caribbean" },
      { text: "Something exotic — Galápagos, SE Asia", value: "exotic" },
      { text: "Don't care — beautiful beach + Disney service", value: "anywhere" },
    ]
  },
{
    id: 'beach_activities',
    question: "Beyond lounging, what do you want to do?",
    condition: (a) => a.vacation_type === 'beach',
    options: [
      { text: "Water sports — snorkeling, kayaking", value: "water" },
      { text: "Kids' activities — pools, kids clubs", value: "kids" },
      { text: "Spa and wellness", value: "spa" },
      { text: "Nothing — literally sit on a beach", value: "nothing" },
    ]
  },
  {
    id: 'beach_stay',
    question: "How long for your beach getaway?",
    condition: (a) => a.vacation_type === 'beach',
    options: [
      { text: "Long weekend (3-4 nights)", value: "short" },
      { text: "Full week (5-7 nights)", value: "week" },
      { text: "Extended (8-14 nights)", value: "extended" },
    ]
  },
];

// ============================================================
// SCORING ENGINE
// ============================================================
function scoreResult(answers: Record<string, string | string[]>): QuizResult {
  const a = answers;
  const vtype = a.vacation_type as string;
  const budget = a.budget as string;
  const party = a.party_type as string;
  const exp = a.experience as string;
  const occasion = a.occasion as string;
  const priority = a.priority as string;
  const pace = a.pace as string;
  const groupSize = a.group_size as string;

  // Helper
  const isLargeGroup = ['5-6', '7-9', '10+'].includes(groupSize);
  const isLuxury = ['luxury', 'unlimited'].includes(budget);
  const isPremium = ['premium', 'luxury', 'unlimited'].includes(budget);
  const isCouple = party === 'couple';
  const isVeteran = ['veteran', 'expert'].includes(exp);
  const hasYoungKids = Array.isArray(a.kids_ages) && (a.kids_ages.includes('toddlers') || a.kids_ages.includes('little'));
  const isSpecialOccasion = occasion !== 'none';

  // ========== PARKS ==========
  if (vtype === 'parks') {
    const vibe = a.resort_vibe as string;
    const dining = a.dining_priority as string;
    const parks = (a.park_priority || []) as string[];
    const isDisneyland = parks.includes('dl');

    if (isDisneyland) {
      if (isPremium) return { product: "Disney's Grand Californian Hotel & Spa", tagline: "Walk to both parks from your private lobby entrance", whyFit: `With ${isPremium ? 'your premium budget' : 'your budget'} and a love for the original Disneyland, the Grand Californian gives you the ultimate convenience — walk to both parks, stunning Craftsman architecture, world-class dining at Napa Rose, and ${hasYoungKids ? "the best pool complex for the little ones" : "an adults-only pool for unwinding after park days"}.`, price: "$600-$1,200/night", bestFor: "Disneyland lovers who want walkable luxury", proTip: "Request a park-view room for fireworks from your balcony", timing: "Spring and fall have the shortest lines", category: 'resort' };
      return { product: "Pixar Place Hotel", tagline: "Pixar magic at a moderate price point", whyFit: `Great choice for Disneyland fans on a ${budget} budget. You get the magic of being on-property with Pixar theming, a rooftop pool, and easy walking distance to both parks. ${hasYoungKids ? "The kids will love the Pixar character touches everywhere." : ""}`, price: "$400-$700/night", bestFor: "Moderate budget Disneyland trips", proTip: "The rooftop pool has incredible views at night", timing: "January and February are the quietest months", category: 'resort' };
    }

    // Large group / multi-gen
    if (isLargeGroup || party === 'multi_gen') {
      if (isLuxury) return { product: "Polynesian Villas & Bungalows", tagline: "Overwater bungalows with fireworks views from your private deck", whyFit: `For your group of ${groupSize}, the Polynesian bungalows offer something truly special — overwater villas right on Seven Seas Lagoon with direct fireworks views from your private deck. Monorail access means easy transport for everyone, and the tropical vibe is perfect for ${occasion !== 'none' ? 'celebrating your ' + occasion : 'a memorable family gathering'}.`, price: "$800-$3,000/night", bestFor: "Multi-gen groups wanting luxury + convenience", proTip: "The bungalows have space for 8 — perfect for a split group", timing: "Book 11+ months out, these sell fast", category: 'resort' };
      if (isPremium) return { product: "BoardWalk Villas 2-Bedroom", tagline: "Space for everyone with EPCOT in your backyard", whyFit: `A 2-bedroom villa gives your group of ${groupSize} room to spread out with a full kitchen, washer/dryer, and separate living space. You're a short walk to EPCOT and Hollywood Studios — no bus required. ${dining === 'high' ? "Plus, the BoardWalk entertainment district has some of Disney's best dining right outside your door." : ""}`, price: "$700-$1,100/night", bestFor: "Groups of 5-8 needing space + location", proTip: "Walk the BoardWalk at night for free entertainment and amazing dining", timing: "Fall food & wine festival is peak BoardWalk season", category: 'resort' };
      return { product: "Art of Animation Family Suites", tagline: "Room for everyone without breaking the bank", whyFit: `Family suites sleep up to 6 with separate living areas — perfect for your group size without the deluxe price tag. The theming (Cars, Finding Nemo, Lion King) ${hasYoungKids ? "will have the little ones absolutely thrilled before you even get to the parks" : "adds Disney magic from the moment you arrive"}. Skyliner access gets you to EPCOT and Hollywood Studios fast.`, price: "$350-$550/night", bestFor: "Budget families needing extra space", proTip: "Request a Finding Nemo suite — they're the biggest and quietest section", timing: "September has the lowest rates", category: 'resort' };
    }

    // Couples
    if (isCouple) {
      if (isLuxury || (isPremium && (occasion === 'anniversary' || occasion === 'proposal'))) return { product: "Grand Floridian Resort & Spa", tagline: "Disney's most elegant resort — where proposals and celebrations feel effortless", whyFit: `The Grand Floridian is the pinnacle of Disney romance. Monorail to Magic Kingdom, Victoria & Albert's (Disney's only AAA Five Diamond restaurant), and the kind of grand lobby that makes ${occasion === 'proposal' ? "getting down on one knee feel like a movie scene" : occasion === 'anniversary' ? "your anniversary toast feel like the only thing in the world" : "every evening feel like a special occasion"}. ${isVeteran ? "Even Disney veterans find new magic here." : ""}`, price: "$700-$1,200/night", bestFor: "Romantic getaways and special occasions", proTip: "Book a theme park view room for fireworks from your balcony", timing: "January after holidays is quieter and more romantic", category: 'resort' };
      if (isPremium && priority === 'unique') return { product: "Riviera Resort", tagline: "European elegance meets Disney innovation", whyFit: `The Riviera is Disney's most stylish resort — rooftop dining at Topolino's Terrace, Skyliner access to two parks, and a sophisticated vibe that feels more European boutique hotel than theme park resort. ${isVeteran ? "If you've done the classics, this is the fresh experience you're looking for." : "First trip or not, this resort makes you feel special."}`, price: "$450-$800/night", bestFor: "Couples wanting sophistication + convenience", proTip: "Topolino's character breakfast is the best on property — book at 6am on the 180-day mark", timing: "EPCOT festivals (spring/fall) pair perfectly with this resort", category: 'resort' };
      if (budget === 'moderate') return { product: "Coronado Springs — Gran Destino Tower", tagline: "A grown-up resort that punches way above its moderate price", whyFit: `Gran Destino Tower is Disney's best-kept secret for couples. Rooftop bar with panoramic views, modern rooms, and a sophisticated Spanish-inspired design that feels deluxe at a moderate price. ${dining === 'high' ? "Toledo restaurant on the top floor is one of Disney's most underrated dining experiences." : ""} It's the adult resort that moderate-budget couples dream about.`, price: "$280-$500/night", bestFor: "Couples wanting a grown-up vibe at moderate pricing", proTip: "The rooftop bar Dahlia Lounge has the best sunset view on property", timing: "Spring is ideal — great weather, manageable crowds", category: 'resort' };
    }

    // Families with young kids
    if (hasYoungKids) {
      if (isPremium && (vibe === 'nature' || parks.includes('ak'))) return { product: "Animal Kingdom Lodge — Savanna View", tagline: "Giraffes and zebras right outside your window", whyFit: `Your little ones are about to have their minds blown. Imagine waking up, opening the curtains, and seeing giraffes, zebras, and wildebeest grazing just below your balcony — before you even get to the parks. Animal Kingdom Lodge combines African luxury with Disney magic. ${dining === 'high' ? "Boma and Jiko are two of Disney's absolute best restaurants." : ""} It's the one resort where kids will BEG to stay in the room.`, price: "$450-$900/night", bestFor: "Families with young kids who love animals", proTip: "Request Savanna view on the Arusha side — fewer rooms, more intimate animal viewing", timing: "Animals are most active early morning and dusk — fall/winter = cooler = more active", category: 'resort' };
      if (isPremium && vibe === 'tropical') return { product: "Polynesian Village Resort", tagline: "Monorail to Magic Kingdom + the best pool complex for families", whyFit: `The Polynesian is the ultimate family resort. Walk or monorail to Magic Kingdom, incredible pool with a volcano waterslide, Trader Sam's for the adults after bedtime, and a tropical vibe that makes every moment feel like vacation. ${isSpecialOccasion ? `Perfect for celebrating — the fireworks view from the beach is ${occasion === 'birthday' ? "the best birthday backdrop imaginable" : "absolutely unforgettable"}.` : "The beach fireworks viewing is worth the stay alone."}`, price: "$650-$1,100/night", bestFor: "Families wanting convenience + tropical vibes", proTip: "Watch the fireworks from the beach with the music piped in — it's magical", timing: "Fall is ideal — lower crowds, good weather, Food & Wine at nearby EPCOT", category: 'resort' };
      if (budget === 'moderate') return { product: "Caribbean Beach Resort", tagline: "Skyliner access, great pools, and that tropical Disney vibe", whyFit: `Caribbean Beach hits the sweet spot for families with young kids — Skyliner gondola takes you to EPCOT and Hollywood Studios (kids LOVE the gondola ride itself), the pool complex has a pirate-ship waterslide, and the tropical theming gets everyone in vacation mode from day one. ${dining === 'high' ? "Plus, Sebastian's Bistro and Centertown Market are solid on-site dining options." : ""}`, price: "$280-$450/night", bestFor: "Young families wanting moderate pricing + great transport", proTip: "Skyliner is way more fun than buses for little kids — it's basically a ride itself", timing: "Late September after school starts — lowest crowds of the year", category: 'resort' };
      return { product: "Art of Animation Resort", tagline: "Your kids will think they've walked into a Disney movie", whyFit: `For families with young children on a ${budget} budget, Art of Animation is unbeatable. Larger-than-life sculptures from Finding Nemo, Cars, and Lion King turn the walk to your room into an adventure. Family suites give you actual space (rare at Disney value resorts). The Big Blue Pool is the largest at Disney World. ${hasYoungKids ? "And Skyliner to EPCOT means no waiting for buses with tired toddlers." : ""}`, price: "$175-$550/night", bestFor: "Budget families with young Disney fans", proTip: "Family suites have a mini kitchen and pull-out beds — way better than cramming into a standard room", timing: "January-early March has the best rates", category: 'resort' };
    }

    // Veterans wanting something new
    if (isVeteran && isPremium) return { product: "VIP Private Tour + Wilderness Lodge", tagline: "See Disney through completely new eyes", whyFit: `You've done the parks — now experience them with a VIP tour guide who knows every shortcut, backstory, and hidden detail. A dedicated Cast Member takes your group through private entrances, reserved viewing spots, and can customize your day around exactly what you want. Pair it with Wilderness Lodge — Disney's most underrated deluxe resort with a national-park feel, boat service to Magic Kingdom, and Geyser Point bar for craft cocktails by the water.`, price: "$450-$900/hr (6hr min) + $450-$800/night", bestFor: "Disney veterans ready for the ultimate upgrade", proTip: "VIP guides can get you into rides through private entrances — no line, no Genie+ needed", timing: "Holiday season VIP tours are particularly magical", category: 'resort' };

    // Default parks
    if (isPremium) return { product: "Yacht & Beach Club Resort", tagline: "The best pool in all of Disney + walk to EPCOT", whyFit: `Stormalong Bay is the best pool complex at Disney World — a 3-acre sand-bottom pool with a lazy river, waterslide, and sand beach. You can walk to EPCOT and Hollywood Studios, the rooms are classic New England elegant, and ${dining === 'high' ? "the dining options (Yachtsman Steakhouse, Cape May Café, Beaches & Cream) are top-tier" : "it's the most centrally located deluxe resort on property"}.`, price: "$550-$950/night", bestFor: "Families wanting the best pool + park proximity", proTip: "Beaches & Cream kitchen sink sundae is a bucket-list Disney dessert", timing: "EPCOT food festivals (spring/fall) make this location unbeatable", category: 'resort' };
    if (budget === 'moderate') return { product: "Port Orleans Riverside — Royal Rooms", tagline: "Princess theming at a moderate price your daughter will never forget", whyFit: `Port Orleans Riverside has the most beautiful grounds at any Disney moderate resort — horse-drawn carriage rides, meandering waterways, and ${hasYoungKids ? "Royal Rooms with princess-themed beds and fiber-optic fireworks on the headboard that will make your kids' jaws drop" : "a Southern charm that feels like stepping into another world"}. Boat service to Disney Springs is a bonus.`, price: "$280-$475/night", bestFor: "Families wanting charm + moderate pricing", proTip: "Take the evening boat to Disney Springs for dinner — it's a gorgeous ride", timing: "Spring is gorgeous at this resort with all the gardens in bloom", category: 'resort' };
    return { product: "Pop Century Resort", tagline: "Renovated rooms + Skyliner = unbeatable value", whyFit: `Don't let the "value" label fool you — Pop Century was recently renovated with modern rooms, Murphy beds for extra space, and the Skyliner station means you're at EPCOT or Hollywood Studios in minutes. At this price point, you can spend more on park experiences and dining. ${pace === 'packed' ? "Plus, you won't be spending much time in the room anyway!" : ""}`, price: "$175-$300/night", bestFor: "Budget-conscious families wanting great transport", proTip: "Skyliner is a game-changer for value resorts — it's faster and more fun than buses", timing: "Late August / early September has the lowest rates of the year", category: 'resort' };
  }

  // ========== CRUISE ==========
  if (vtype === 'cruise') {
    const dest = a.cruise_dest as string;
    const length = a.cruise_length as string;
    const cabin = a.cabin_type as string;
    const shipPriority = (a.ship_priority || []) as string[];

    if (dest === 'alaska') return { product: "Disney Wonder — Alaska 7-Night", tagline: "Glaciers, whales, and Disney magic in America's last frontier", whyFit: `Alaska on the Disney Wonder is a once-in-a-lifetime experience. Sail past glaciers, watch humpback whales from your ${cabin === 'verandah' || cabin === 'concierge' ? "private verandah" : "deck"}, and experience Tracy Arm Fjord and Juneau. ${hasYoungKids ? "The kids will be mesmerized by the wildlife — it's like a real-life Animal Kingdom." : ""} ${isSpecialOccasion ? `And celebrating ${occasion} against an Alaskan backdrop? Unforgettable.` : ""}`, price: "$6,000-$15,000 (family of 4)", bestFor: "Nature lovers + Disney fans wanting a unique cruise", proTip: "Book a starboard side verandah (right side of ship) for the best glacier views", timing: "June-August only — book 12+ months ahead", category: 'cruise' };
    if (dest === 'europe') return { product: "Disney Magic — Mediterranean Cruise", tagline: "Ancient cities, beautiful ports, and Disney hospitality tying it all together", whyFit: `Sail the Mediterranean with Disney's signature service. Visit Barcelona, Rome, Naples, and more with the convenience of unpacking once. ${isCouple ? "The adult-exclusive areas are particularly wonderful on European itineraries." : "The kids enjoy the ship while you explore historic ports — everyone wins."} ${a.dining_priority === 'high' ? "Palo and Remy (adult-only dining) are destination-worthy restaurants in their own right." : ""}`, price: "$8,000-$18,000 (family of 4)", bestFor: "Families wanting culture + convenience", proTip: "Book port excursions early — popular ones like Pompeii and Vatican tours sell out fast", timing: "Summer sailings — book 12-18 months in advance", category: 'cruise' };
    if (length === 'short') return { product: "Disney Wish — 3-Night Bahamas", tagline: "The newest ship + Castaway Cay in a long-weekend getaway", whyFit: `The Wish is Disney's newest and most innovative cruise ship. In just 3 nights you get a day at Castaway Cay (Disney's private island), the AquaMouse water ride, ${shipPriority.includes('kids') ? "Marvel Super Hero Academy and the incredible Oceaneer Club" : "stunning dining experiences and the first-ever Disney attraction at sea"}. ${exp === 'first' ? "It's the perfect first cruise — short enough to test the waters, magical enough to hook you." : "Short getaway, maximum magic."}`, price: "$2,500-$5,000 (family of 4)", bestFor: "First-time cruisers or quick getaways", proTip: "Book Wave season (January-March) for the best rates on short sailings", timing: "Year-round from Port Canaveral", category: 'cruise' };
    if (isLuxury && cabin === 'concierge') return { product: "Disney Treasure — Concierge 7-Night Caribbean", tagline: "VIP from embarkation to disembarkation", whyFit: `The Treasure is Disney's newest large ship with the most luxurious concierge experience at sea. Private lounge, dedicated concierge team, priority everything — boarding, dining, excursions. ${isSpecialOccasion ? `For ${occasion}, the concierge team will make sure every detail is handled.` : ""} Two Castaway Cay stops on the 7-night means double the private island time.`, price: "$8,000-$15,000 (family of 4)", bestFor: "Luxury seekers wanting the newest Disney ship", proTip: "Concierge guests get private cabanas at Castaway Cay — worth it", timing: "Book 18+ months out for concierge staterooms", category: 'cruise' };
return { product: "Disney Fantasy — 7-Night Eastern Caribbean", tagline: "The sweet spot of Disney cruising — long enough to decompress, packed with magic", whyFit: `The Fantasy's 7-night Eastern Caribbean is Disney's most popular itinerary for good reason. Castaway Cay, St. Thomas, Tortola — with ${shipPriority.includes('adult') ? "incredible adult spaces including Satellite Falls and the Quiet Cove pool" : shipPriority.includes('kids') ? "the best kids club program at sea" : "a perfect mix of port days and sea days"}. ${pace === 'relaxed' ? "Plenty of sea days to enjoy the ship at your own pace." : "Every day is packed with activities and shows."}`, price: "$5,000-$10,000 (family of 4)", bestFor: "The classic Disney cruise experience", proTip: "Day-of-sailing dining reservations open 30 days before — grab Remy or Palo immediately", timing: "September/October has the best 7-night pricing", category: 'cruise' };
  }

  // ========== ADVENTURE ==========
  if (vtype === 'adventure') {
    const region = a.adventure_region as string;
    const style = a.travel_style as string;

    if (style === 'river') {
      if (occasion === 'anniversary' || isCouple) return { product: "ABD Rhine River Cruise", tagline: "Castles, vineyards, and romance floating through Europe", whyFit: `The Rhine river cruise is Disney's most romantic guided vacation. Sail past fairytale castles that inspired Sleeping Beauty, taste wines in ancient cellars, and explore medieval villages. ${occasion === 'anniversary' ? "For an anniversary, this is pure magic — without the theme parks." : "It's the adult Disney experience most people don't know exists."}`, price: "$4,000-$7,000/person", bestFor: "Couples and adults wanting Disney magic without theme parks", proTip: "Spring sailings mean tulip season in Holland — absolutely stunning", timing: "April-October, book 12+ months ahead", category: 'adventure' };
      return { product: "ABD Danube River Cruise", tagline: "Budapest, Vienna, and Nuremberg — history and culture flowing past your window", whyFit: `Float through the heart of Europe visiting iconic cities, Gothic cathedrals, and UNESCO World Heritage Sites. Disney's Adventure Guides handle every detail while you take in Budapest's thermal baths, Vienna's concert halls, and Bavarian beer gardens. ${isLargeGroup ? "Great for multi-generational groups — the ship is a floating basecamp everyone shares." : ""}`, price: "$4,000-$7,000/person", bestFor: "History and culture lovers", proTip: "The Christmas market sailing in December is absolutely magical", timing: "June-August for best weather, December for Christmas markets", category: 'adventure' };
    }
    if (region === 'africa') {
      if (isLuxury || style === 'expedition') return { product: "National Geographic East Africa Safari", tagline: "The Great Migration with Nat Geo experts — this changes you", whyFit: `This isn't a zoo. This is the Serengeti and Masai Mara with National Geographic photographers and naturalists guiding you to the world's greatest wildlife spectacle. Premium tented camps, private game drives, and cultural immersion with local communities. ${budget === 'unlimited' ? "At your budget level, ask about the private jet safari option." : "It's the trip that makes you see the world differently."}`, price: "$12,000-$20,000/person", bestFor: "Serious travelers wanting a transformative experience", proTip: "June-October for the Great Migration — July is peak wildebeest river crossings", timing: "Book 12+ months out, limited spots per departure", category: 'adventure' };
      return { product: "Adventures by Disney South Africa", tagline: "Big Five safari with Disney comfort and family-friendliness", whyFit: `ABD South Africa is the accessible version of an African safari — Big Five game drives at Kapama Private Game Reserve, Cape Town's stunning coastline, and Table Mountain. All with Disney's family-friendly approach, meaning ${hasYoungKids ? "the kids are engaged and safe every step of the way" : "the logistics are completely handled"}. It's bucket-list travel made comfortable.`, price: "$8,000-$12,000/person", bestFor: "Families wanting safari without roughing it", proTip: "The private game reserve means off-road tracking — way better than national parks", timing: "May-September (dry season) for best animal viewing", category: 'adventure' };
    }
    if (region === 'europe') return { product: "Adventures by Disney Italy", tagline: "Rome, Florence, Venice — with Disney making every moment effortless", whyFit: `Italy is ABD's most popular destination for good reason. Skip the lines at the Vatican and Colosseum, make pasta with a Tuscan chef, and ride a gondola in Venice — all with Disney Adventure Guides handling every transfer, reservation, and detail. ${hasYoungKids ? "The kid-friendly activities (gladiator training, gelato making) keep them engaged while you soak in the culture." : "It's Italy without the stress of planning Italy."}`, price: "$6,000-$9,000/person", bestFor: "Families wanting hassle-free European travel", proTip: "The skip-the-line access alone is worth the ABD premium", timing: "May/June or September/October for best weather and smaller crowds", category: 'adventure' };
    if (region === 'americas') return { product: "Adventures by Disney Costa Rica", tagline: "Zip-lines, rainforest, wildlife — and your kids will never forget it", whyFit: `Costa Rica is the perfect adventure-meets-nature trip. Zip-line through cloud forest canopy, raft the Pacuare River, and spot toucans and monkeys with naturalist guides. ${hasYoungKids ? "ABD makes this safe and fun for even younger kids with age-appropriate activities." : "The mix of adrenaline and nature is perfect for active families."} Disney handles every detail so you just show up and experience it.`, price: "$5,000-$7,000/person", bestFor: "Active families wanting nature + adventure", proTip: "The white-water rafting day is legendary — don't skip it", timing: "December-April (dry season) is ideal", category: 'adventure' };
    return { product: "Adventures by Disney Japan", tagline: "Bullet trains, ancient temples, and ramen — with Disney making it all click", whyFit: `Japan can be intimidating to plan — ABD takes that completely away. Ride the Shinkansen between Tokyo and Kyoto, learn sword-making from a master craftsman, visit ancient temples, and experience the collision of ultra-modern and traditional Japanese culture. ${isVeteran ? "If you've done the parks and cruises, this is the next frontier of Disney travel." : "It's the trip everyone says changed how they see travel."}`, price: "$7,000-$10,000/person", bestFor: "Culture lovers wanting expert-guided Japan", proTip: "Spring cherry blossom season departures sell out fastest — book immediately", timing: "March-April (cherry blossoms) or October-November (fall foliage)", category: 'adventure' };
  }

  // ========== BEACH ==========
  if (vtype === 'beach') {
    const bdest = a.beach_dest as string;
    const bact = a.beach_activities as string;
    const bstay = a.beach_stay as string;

    if (bdest === 'exotic') return { product: "National Geographic Galápagos Expedition", tagline: "Beach + wildlife + the trip of a lifetime", whyFit: `The Galápagos is where beach meets bucket list. Snorkel with sea lions, walk among giant tortoises, and explore volcanic landscapes with National Geographic naturalists. It's not a traditional beach vacation — it's an expedition with incredible beaches along the way. ${isLuxury ? "Premium expedition ships with surprisingly luxurious cabins." : "Worth every penny for an experience you literally can't get anywhere else on Earth."}`, price: "$10,000-$15,000/person", bestFor: "Beach lovers wanting something extraordinary", proTip: "The snorkeling at Devil's Crown is world-class — don't miss it", timing: "June-September for cooler water and more wildlife activity", category: 'beach' };
    if (bdest === 'caribbean') return { product: "Disney Fantasy 7-Night Eastern Caribbean", tagline: "Multiple Caribbean beach days + Disney magic at sea", whyFit: `For Caribbean beach lovers, the Disney Fantasy gives you the best of both worlds — stunning beaches at Castaway Cay (Disney's private island), St. Thomas, and Tortola, plus all the Disney ship entertainment between port days. ${bact === 'water' ? "Every port offers incredible snorkeling and water sports." : bact === 'spa' ? "Sea days mean spa time at Senses Spa." : "The ship's pools and private island give you all the beach time you need."}`, price: "$5,000-$10,000 (family of 4)", bestFor: "Beach families wanting Caribbean variety", proTip: "Castaway Cay has a secret adults-only beach called Serenity Bay — don't miss it", timing: "September-November for lowest prices on 7-night sailings", category: 'cruise' };
    // Default to Aulani
    if (isLargeGroup) return { product: "Aulani 2-Bedroom Villa", tagline: "Hawaii beach resort with space for your whole crew", whyFit: `Aulani's 2-bedroom villas give your group of ${groupSize} a full kitchen, washer/dryer, and separate living spaces on Ko Olina's stunning beach. ${hasYoungKids ? "Aunty's Beach House (Disney's free kids club) means adults get actual beach time while kids are entertained by Disney magic." : "The infinity pool overlooking the ocean is where your group will want to live."} ${bstay === 'extended' ? "For a longer stay, the full kitchen saves hundreds on dining." : ""}`, price: "$900-$1,500/night", bestFor: "Groups wanting Hawaiian beach + Disney service", proTip: "Ko Olina's lagoons are the calmest swimming beaches on Oahu — perfect for young kids", timing: "September-November for best rates (still warm!)", category: 'beach' };
    return { product: "Aulani — A Disney Resort & Spa", tagline: "Hawaiian paradise with a Disney heart", whyFit: `Aulani is where Disney magic meets Hawaii's aloha spirit. Ko Olina's calm lagoon beach, a lazy river that winds through the resort, ${hasYoungKids ? "Aunty's Beach House kids club (it's FREE and staffed by Disney Cast Members)" : "the Laniwai Spa with outdoor hydrotherapy gardens"}, and enough Hawaiian culture woven in to make it feel authentic — not theme-parky. ${isSpecialOccasion ? `For your ${occasion}, the beachfront sunset is the backdrop of dreams.` : "It's the vacation where you actually come home rested."}`, price: "$450-$900/night", bestFor: "Beach lovers wanting Disney service + Hawaiian culture", proTip: "The Starlit Hui evening show is a free Hawaiian performance on the lawn — don't miss it", timing: "April-June or September-November for best prices and weather", category: 'beach' };
  }

  // Fallback
  return { product: "Walt Disney World — Magic Kingdom Area Resort", tagline: "The most magical place on Earth awaits", whyFit: "Based on your answers, a classic Walt Disney World vacation is the perfect starting point. Let's talk about the details to narrow down the exact right resort, dining plan, and park strategy for your family.", price: "Varies", bestFor: "Disney dreamers ready to start planning", proTip: "Working with a Disney travel expert is free and saves you hours of planning", timing: "Anytime is a great time for Disney!", category: 'resort' };
}

// ============================================================
// MAIN APP COMPONENT
// ============================================================
export default function App() {
  const config = useMemo(() => getConfig(), []);
  const [step, setStep] = useState<'email' | 'quiz' | 'result'>('email');
  const [email, setEmail] = useState('');
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [multiSelections, setMultiSelections] = useState<string[]>([]);
  const [animating, setAnimating] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);

  // Filter questions based on conditions
  const activeQuestions = useMemo(() =>
    QUESTIONS.filter(q => !q.condition || q.condition(answers)),
    [answers]
  );

  const currentQuestion = activeQuestions[currentQ];
  const totalQuestions = activeQuestions.length;
  const progress = totalQuestions > 0 ? ((currentQ + 1) / totalQuestions) * 100 : 0;

  // Transition helper
  const animateNext = useCallback((cb: () => void) => {
    setAnimating(true);
    setTimeout(() => {
      cb();
      setAnimating(false);
    }, 300);
  }, []);

  // Handle single-select answer
  const handleAnswer = useCallback((value: string) => {
    if (animating) return;
    const newAnswers = { ...answers, [currentQuestion.id]: value };
    setAnswers(newAnswers);

    animateNext(() => {
      // Recalculate active questions with new answers
      const nextActive = QUESTIONS.filter(q => !q.condition || q.condition(newAnswers));
      const nextIdx = currentQ + 1;
      if (nextIdx >= nextActive.length) {
        const r = scoreResult(newAnswers);
        setResult(r);
        setStep('result');
        sendLead(newAnswers, r);
      } else {
        setCurrentQ(nextIdx);
        setMultiSelections([]);
      }
    });
  }, [answers, currentQ, currentQuestion, animating, animateNext]);

  // Handle multi-select toggle
  const toggleMulti = useCallback((value: string) => {
    setMultiSelections(prev => {
      if (prev.includes(value)) return prev.filter(v => v !== value);
      if (currentQuestion.maxSelect && prev.length >= currentQuestion.maxSelect) return prev;
      return [...prev, value];
    });
  }, [currentQuestion]);
// Submit multi-select
  const submitMulti = useCallback(() => {
    if (multiSelections.length === 0 || animating) return;
    const newAnswers = { ...answers, [currentQuestion.id]: multiSelections };
    setAnswers(newAnswers);

    animateNext(() => {
      const nextActive = QUESTIONS.filter(q => !q.condition || q.condition(newAnswers));
      const nextIdx = currentQ + 1;
      if (nextIdx >= nextActive.length) {
        const r = scoreResult(newAnswers);
        setResult(r);
        setStep('result');
        sendLead(newAnswers, r);
      } else {
        setCurrentQ(nextIdx);
        setMultiSelections([]);
      }
    });
  }, [multiSelections, answers, currentQ, currentQuestion, animating, animateNext]);

  // Go back
  const goBack = useCallback(() => {
    if (currentQ > 0 && !animating) {
      animateNext(() => {
        setCurrentQ(currentQ - 1);
        setMultiSelections([]);
      });
    }
  }, [currentQ, animating, animateNext]);

  // Send lead data to webhook
  const sendLead = async (allAnswers: Record<string, string | string[]>, quizResult: QuizResult) => {
    if (!config.webhookUrl) return;
    try {
      await fetch(config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          answers: allAnswers,
          result: quizResult,
          agent: config.agentName,
          timestamp: new Date().toISOString(),
          source: 'disney-quiz',
        }),
      });
    } catch (e) {
      console.error('Webhook failed:', e);
    }
  };

  // Email submit
  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim() && email.includes('@')) {
      setStep('quiz');
    }
  };

  // Reset
  const resetQuiz = () => {
    setStep('email');
    setEmail('');
    setCurrentQ(0);
    setAnswers({});
    setMultiSelections([]);
    setResult(null);
  };

  // Category emoji/icon
  const categoryEmoji = (cat: string) => {
    switch(cat) {
      case 'resort': return '🏰';
      case 'cruise': return '🚢';
      case 'adventure': return '✈️';
      case 'beach': return '🌴';
      default: return '✨';
    }
  };

  return (
    <div className={`min-h-screen font-[Inter,sans-serif] ${config.embedded ? '' : 'bg-gradient-to-br from-purple-950 via-purple-900 to-pink-900'}`}>
      <div className={`${config.embedded ? '' : 'min-h-screen flex items-center justify-center p-4 md:p-8'}`}>
        <div className={`w-full max-w-2xl mx-auto ${config.embedded ? '' : 'bg-white rounded-3xl shadow-2xl overflow-hidden'}`}>

          {/* ===== EMAIL CAPTURE ===== */}
          {step === 'email' && (
            <div className="animate-fade-in-up">
              <div className="p-8 md:p-12 text-center" style={{ background: `linear-gradient(135deg, ${config.primaryColor} 0%, ${config.accentColor} 100%)` }}>
                <div className="text-5xl mb-4">✨</div>
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-3" style={{ fontFamily: 'Cinzel, serif' }}>
                  Find Your Perfect Disney Vacation
                </h1>
                <p className="text-white/80 text-lg max-w-md mx-auto">
                  I'll ask you the same questions I'd ask on a real planning call — and match you with the exact experience your family will love.
                </p>
                {config.agentName && (
                  <p className="text-white/60 text-sm mt-3">Powered by {config.agentName}</p>
)}
              </div>
              <form onSubmit={handleEmailSubmit} className="p-8 md:p-12">
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Enter your email to get started
                </label>
                <div className="flex gap-3">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="flex-1 rounded-full border border-gray-200 px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-300"
                  />
                  <button
                    type="submit"
                    className="rounded-full px-6 py-3 text-white font-semibold text-sm transition-all hover:scale-105 active:scale-95 animate-pulse-glow"
                    style={{ background: `linear-gradient(135deg, ${config.primaryColor} 0%, ${config.accentColor} 100%)` }}
                  >
                    Let's Go →
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-3">No spam, ever. Just your personalized Disney recommendation.</p>
              </form>
            </div>
          )}

          {/* ===== QUIZ QUESTIONS ===== */}
          {step === 'quiz' && currentQuestion && (
            <div key={currentQuestion.id} className={`transition-all duration-300 ${animating ? 'opacity-0 translate-x-8' : 'opacity-100 translate-x-0'}`}>
              {/* Progress */}
              <div className="px-8 pt-6">
                <div className="flex justify-between text-xs text-gray-400 mb-2">
                  <span>Question {currentQ + 1} of {totalQuestions}</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${config.primaryColor}, ${config.accentColor})` }}
                  />
                </div>
              </div>

              {/* Question */}
              <div className="p-8">
                {currentQ > 0 && (
                  <button onClick={goBack} className="text-sm text-gray-400 hover:text-gray-600 mb-4 flex items-center gap-1 transition-colors">
                    ← Back
                  </button>
                )}
                <h2 className="text-xl md:text-2xl font-bold mb-2" style={{ color: config.primaryColor, fontFamily: 'Cinzel, serif' }}>
                  {currentQuestion.question}
                </h2>
                {currentQuestion.subtext && (
                  <p className="text-sm text-gray-500 mb-4">{currentQuestion.subtext}</p>
                )}

                {/* Options */}
                <div className="space-y-3 mt-6">
                  {currentQuestion.options.map((opt, i) => {
                    const isMulti = currentQuestion.multi;
                    const isSelected = isMulti ? multiSelections.includes(opt.value) : false;

                    return (
                      <button
                        key={i}
                        onClick={() => isMulti ? toggleMulti(opt.value) : handleAnswer(opt.value)}
                        className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-md ${
                          isSelected
                            ? 'border-purple-500 bg-purple-50 shadow-md'
                            : 'border-gray-100 hover:border-purple-200 bg-white'
                        }`}
                        style={isSelected ? { borderColor: config.primaryColor, backgroundColor: `${config.primaryColor}10` } : {}}
                      >
                        <div className="flex items-center gap-3">
                          {isMulti && (
                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                              isSelected ? 'bg-purple-600 border-purple-600' : 'border-gray-300'
                            }`}
                            style={isSelected ? { backgroundColor: config.primaryColor, borderColor: config.primaryColor } : {}}>
                              {isSelected && <span className="text-white text-xs">✓</span>}
                            </div>
                          )}
                          <div>
                            <span className="font-medium text-gray-800">{opt.text}</span>
                            {opt.desc && <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Multi-select submit */}
                {currentQuestion.multi && (
                  <button
                    onClick={submitMulti}
                    disabled={multiSelections.length === 0}
className="mt-6 w-full rounded-full py-3 text-white font-semibold text-sm transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{ background: `linear-gradient(135deg, ${config.primaryColor} 0%, ${config.accentColor} 100%)` }}
                  >
                    Continue →
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ===== RESULT ===== */}
          {step === 'result' && result && (
            <div className="animate-fade-in-up">
              {/* Result header */}
              <div className="p-8 md:p-12 text-center" style={{ background: `linear-gradient(135deg, ${config.primaryColor} 0%, ${config.accentColor} 100%)` }}>
                <div className="text-5xl mb-3">{categoryEmoji(result.category)}</div>
                <p className="text-white/70 text-sm font-medium uppercase tracking-wider mb-2">Your Perfect Match</p>
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-2" style={{ fontFamily: 'Cinzel, serif' }}>
                  {result.product}
                </h2>
                <p className="text-white/80 text-lg italic">{result.tagline}</p>
              </div>

              {/* Result body */}
              <div className="p-8 md:p-12">
                {/* Why this fits */}
                <div className="mb-8">
                  <h3 className="font-bold text-lg mb-3" style={{ color: config.primaryColor, fontFamily: 'Cinzel, serif' }}>
                    Why This Is Perfect For You
                  </h3>
                  <p className="text-gray-700 leading-relaxed">{result.whyFit}</p>
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Price Range</p>
                    <p className="font-semibold text-gray-800 text-sm">{result.price}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Best For</p>
                    <p className="font-semibold text-gray-800 text-sm">{result.bestFor}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Ideal Timing</p>
                    <p className="font-semibold text-gray-800 text-sm">{result.timing}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Pro Tip</p>
                    <p className="font-semibold text-gray-800 text-sm">{result.proTip}</p>
                  </div>
                </div>

                {/* CTA */}
                <a
                  href={config.ctaUrl || '#'}
                  onClick={e => {
                    if (!config.ctaUrl) {
                      e.preventDefault();
                      // Try to message parent window for iframe embed
                      window.parent?.postMessage({ type: 'quiz-complete', email, result, answers }, '*');
                    }
                  }}
                  className="block w-full text-center rounded-full py-4 text-white font-bold text-lg transition-all hover:scale-[1.02] active:scale-[0.98] animate-pulse-glow"
                  style={{ background: `linear-gradient(135deg, ${config.primaryColor} 0%, ${config.accentColor} 100%)` }}
                >
                  {config.ctaText}
                </a>

                <p className="text-center text-xs text-gray-400 mt-3">
                  {config.agentName} will put together a free, no-obligation custom quote based on your answers.
                </p>

                <button
                  onClick={resetQuiz}
                  className="mt-6 w-full text-center text-sm font-medium transition-colors hover:underline"
                  style={{ color: config.primaryColor }}
                >
                  ← Take the quiz again
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}