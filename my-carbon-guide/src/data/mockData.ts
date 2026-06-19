export const mockUser = {
  name: "Muhammad Nazeem",
  city: "Mangaluru",
  college: "SIT Mangaluru",
  streak: 7,
  rank: 42,
  xp: 1240,
  level: "Green Guardian",
  todayCO2: 1.24,
  dailyGoal: 2.0,
  treesPlanted: 7,
  realTreeProgress: 34,
  weeklyData: [1.8, 0.9, 2.1, 1.4, 0.7, 1.2, 1.24],
  categoryBreakdown: {
    transport: 45, food: 30, energy: 18, shopping: 7
  },
  badges: [
    { id: "first_log",      label: "First Log",      emoji: "🌱", earned: true },
    { id: "streak_7",       label: "7-Day Streak",   emoji: "🔥", earned: true },
    { id: "carbon_hero",    label: "Carbon Hero",    emoji: "🦸", earned: true },
    { id: "green_commuter", label: "Green Commuter", emoji: "🚲", earned: true },
    { id: "city_top10",     label: "City Top 10",    emoji: "🏆", earned: false },
    { id: "eco_warrior",    label: "Eco Warrior",    emoji: "🌍", earned: false }
  ]
};

export const mockActivities = [
  { id: 1, activityKey: "car_petrol",  quantity: 5,  timestamp: "2026-06-14T08:30:00" },
  { id: 2, activityKey: "veg_meal",    quantity: 1,  timestamp: "2026-06-14T13:00:00" },
  { id: 3, activityKey: "ac_hour",     quantity: 2,  timestamp: "2026-06-14T15:00:00" },
  { id: 4, activityKey: "nonveg_meal", quantity: 1,  timestamp: "2026-06-14T20:00:00" }
];

export const mockLeaderboard = [
  { rank: 1,  name: "Priya S",         city: "Mangaluru", co2: 0.62, trend: "up" as const,   initials: "PS" },
  { rank: 2,  name: "Rahul M",         city: "Mangaluru", co2: 0.74, trend: "down" as const, initials: "RM" },
  { rank: 3,  name: "Ananya K",        city: "Mangaluru", co2: 0.89, trend: "up" as const,   initials: "AK" },
  { rank: 4,  name: "Kiran B",         city: "Mangaluru", co2: 0.95, trend: "same" as const, initials: "KB" },
  { rank: 5,  name: "Sneha M",         city: "Mangaluru", co2: 1.02, trend: "down" as const, initials: "SM" },
  { rank: 42, name: "Muhammad Nazeem", city: "Mangaluru", co2: 1.24, trend: "up" as const,   initials: "MN" }
];

// Compatibility exports for existing pages
export const currentUser = {
  name: mockUser.name,
  email: "nazeem@ecolog.app",
  city: mockUser.city,
  streak: mockUser.streak,
  rank: mockUser.rank,
  totalLogs: 184,
  daysActive: 38,
  dailyGoalKg: mockUser.dailyGoal,
  todayKg: mockUser.todayCO2,
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const weeklyData = mockUser.weeklyData.map((kg, i) => ({
  day: DAYS[i] || "Day",
  kg
}));

export const monthlyTrend = [
  { date: "W1", kg: 12.4 },
  { date: "W2", kg: 10.8 },
  { date: "W3", kg: 9.6 },
  { date: "W4", kg: 9.34 },
];

export const categoryBreakdown = [
  { name: "Transport", value: mockUser.categoryBreakdown.transport, color: "#1D9E75" },
  { name: "Food", value: mockUser.categoryBreakdown.food, color: "#F59E0B" },
  { name: "Energy", value: mockUser.categoryBreakdown.energy, color: "#60A5FA" },
  { name: "Shopping", value: mockUser.categoryBreakdown.shopping, color: "#A78BFA" },
];

export const aiRecommendations = [
  { title: "Switch to public transport on weekdays", impact: "saves 18kg CO₂/month", difficulty: "Easy" as const },
  { title: "Cut one non-veg meal per week", impact: "saves 9kg CO₂/month", difficulty: "Easy" as const },
  { title: "Set AC to 26°C instead of 22°C", impact: "saves 14kg CO₂/month", difficulty: "Medium" as const },
  { title: "Use cold water for laundry", impact: "saves 6kg CO₂/month", difficulty: "Easy" as const },
  { title: "Skip one online order per month", impact: "saves 11kg CO₂/month", difficulty: "Medium" as const },
];

export const leaderboard = mockLeaderboard.map(item => ({
  rank: item.rank,
  name: item.name,
  score: item.co2,
  trend: item.trend
}));

export const badges = mockUser.badges.map(b => ({
  name: b.label,
  emoji: b.emoji,
  earned: b.earned
}));