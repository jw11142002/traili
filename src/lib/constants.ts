export const TASTES = [
  { id: "views", label: "Big views", emoji: "🏔️" },
  { id: "lakes", label: "Alpine lakes", emoji: "🏞️" },
  { id: "waterfalls", label: "Waterfalls", emoji: "💧" },
  { id: "forest", label: "Old forests", emoji: "🌲" },
  { id: "coast", label: "Coastal", emoji: "🌊" },
  { id: "desert", label: "Desert & canyons", emoji: "🏜️" },
  { id: "summit", label: "Summits", emoji: "⛰️" },
  { id: "ridge", label: "Ridgelines", emoji: "🧗" },
  { id: "wildflowers", label: "Wildflowers", emoji: "🌼" },
  { id: "solitude", label: "Solitude", emoji: "🤫" },
  { id: "dogs", label: "Dog friendly", emoji: "🐕" },
  { id: "kids", label: "Kid friendly", emoji: "🧒" },
  { id: "loops", label: "Loops", emoji: "🔁" },
  { id: "swim", label: "Swimming holes", emoji: "🩱" },
  { id: "sunrise", label: "Sunrise / sunset", emoji: "🌅" },
  { id: "snow", label: "Snow & winter", emoji: "❄️" },
] as const;

export const COMFORT = [
  { id: "short", label: "Short & sweet", detail: "Under 5 mi / 8 km" },
  { id: "medium", label: "Half-day", detail: "5–10 mi / 8–16 km" },
  { id: "long", label: "Full-day", detail: "10–18 mi / 16–30 km" },
  { id: "epic", label: "Epic", detail: "18+ mi, multi-day, big vert" },
] as const;

export const CONDITIONS = [
  { id: "dry", label: "Dry" },
  { id: "muddy", label: "Muddy" },
  { id: "snow", label: "Snow" },
  { id: "ice", label: "Icy" },
  { id: "wet", label: "Rain" },
  { id: "smoke", label: "Smoky" },
  { id: "bugs", label: "Bugs" },
  { id: "overgrown", label: "Overgrown" },
  { id: "windy", label: "Windy" },
  { id: "hot", label: "Hot" },
] as const;

export const COMPANIONS = [
  { id: "solo", label: "Solo" },
  { id: "partner", label: "Partner" },
  { id: "friends", label: "Friends" },
  { id: "family", label: "Family" },
  { id: "kids", label: "Kids" },
  { id: "dog", label: "Dog" },
] as const;

export const CROWD = [
  { id: "empty", label: "Had it to myself" },
  { id: "light", label: "A few people" },
  { id: "busy", label: "Busy" },
  { id: "packed", label: "Packed" },
] as const;

export const EFFORT = [
  { id: "easy", label: "Easy", detail: "Mellow, short" },
  { id: "moderate", label: "Moderate", detail: "A workout" },
  { id: "hard", label: "Hard", detail: "Big day" },
] as const;

export const REPEAT = [
  { id: "yes", label: "Yes, anytime" },
  { id: "seasonal", label: "Right season only" },
  { id: "once", label: "Once was enough" },
] as const;
