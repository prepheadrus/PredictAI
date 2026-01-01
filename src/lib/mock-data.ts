import type { League, Team, Match, PortfolioItem } from './types';

export const leagues: League[] = [
  { id: 1, name: 'Premier League', country: 'England' },
  { id: 2, name: 'La Liga', country: 'Spain' },
  { id: 3, name: 'Bundesliga', country: 'Germany' },
  { id: 4, name: 'Ligue 1', country: 'France' },
  { id: 5, name: 'Serie A', country: 'Italy' },
];

export const teams: Team[] = [
  { id: 1, name: 'Manchester City', logoUrl: 'https://picsum.photos/seed/mancity/100/100' },
  { id: 2, name: 'Liverpool FC', logoUrl: 'https://picsum.photos/seed/liverpool/100/100' },
  { id: 3, name: 'Real Madrid', logoUrl: 'https://picsum.photos/seed/realmadrid/100/100' },
  { id: 4, name: 'FC Barcelona', logoUrl: 'https://picsum.photos/seed/barcelona/100/100' },
  { id: 5, name: 'Bayern Munich', logoUrl: 'https://picsum.photos/seed/bayern/100/100' },
  { id: 6, name: 'Borussia Dortmund', logoUrl: 'https://picsum.photos/seed/dortmund/100/100' },
  { id: 7, name: 'Paris Saint-Germain', logoUrl: 'https://picsum.photos/seed/psg/100/100' },
  { id: 8, name: 'Olympique de Marseille', logoUrl: 'https://picsum.photos/seed/marseille/100/100' },
  { id: 9, name: 'Juventus FC', logoUrl: 'https://picsum.photos/seed/juventus/100/100' },
  { id: 10, name: 'AC Milan', logoUrl: 'https://picsum.photos/seed/milan/100/100' },
];

const generateRandomDate = (start: Date, end: Date) => {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

const createH2HMatch = (team1: Team, team2: Team, pastDays: number): Match => ({
    id: Math.floor(Math.random() * 10000),
    homeTeam: Math.random() > 0.5 ? team1 : team2,
    awayTeam: Math.random() > 0.5 ? team2 : team1,
    date: generateRandomDate(new Date(Date.now() - pastDays * 24 * 60 * 60 * 1000), new Date(Date.now() - (pastDays - 30) * 24 * 60 * 60 * 1000)).toISOString(),
    league: leagues[Math.floor(Math.random() * leagues.length)],
    prediction: 'Home',
    confidence: 0,
    odds: { home: 0, draw: 0, away: 0 },
    status: 'Won',
    result: {
        homeScore: Math.floor(Math.random() * 4),
        awayScore: Math.floor(Math.random() * 4),
    },
    h2h: [],
    homeTeamForm: [],
    awayTeamForm: [],
});

const createMatch = (id: number, homeTeam: Team, awayTeam: Team, league: League): Match => {
    const date = new Date();
    date.setDate(date.getDate() + (id % 7));
    const h2hMatches = Array.from({ length: 3 }, (_, i) => createH2HMatch(homeTeam, awayTeam, 100 + i * 180));
    
    return {
        id,
        homeTeam,
        awayTeam,
        date: date.toISOString(),
        league,
        prediction: (['Home', 'Draw', 'Away'] as const)[id % 3],
        confidence: 50 + Math.floor(Math.random() * 50),
        odds: {
            home: parseFloat((1.5 + Math.random()).toFixed(2)),
            draw: parseFloat((3.0 + Math.random()).toFixed(2)),
            away: parseFloat((2.5 + Math.random() * 2).toFixed(2)),
        },
        status: 'Pending',
        h2h: h2hMatches,
        homeTeamForm: ['W', 'D', 'W', 'L', 'W'],
        awayTeamForm: ['L', 'D', 'W', 'W', 'L'],
    };
};

export const matches: Match[] = [
    createMatch(1, teams[0], teams[1], leagues[0]),
    createMatch(2, teams[2], teams[3], leagues[1]),
    createMatch(3, teams[4], teams[5], leagues[2]),
    createMatch(4, teams[6], teams[7], leagues[3]),
    createMatch(5, teams[8], teams[9], leagues[4]),
    createMatch(6, teams[1], teams[4], leagues[0]),
    createMatch(7, teams[3], teams[0], leagues[1]),
];

const createPortfolioItem = (match: Match, status: 'Won' | 'Lost', daysAgo: number): PortfolioItem => {
    const betOn = match.prediction;
    const staked = 10;
    const profit = status === 'Won' ? staked * match.odds[betOn.toLowerCase() as 'home' | 'draw' | 'away'] - staked : -staked;
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);

    return {
        ...match,
        id: match.id + 1000 + daysAgo,
        status,
        date: date.toISOString(),
        betOn,
        staked,
        profit,
        result: {
            homeScore: status === 'Won' && betOn === 'Home' ? 2 : 1,
            awayScore: status === 'Won' && betOn === 'Away' ? 2 : 1,
        }
    };
};

export const portfolio: PortfolioItem[] = [
    createPortfolioItem(matches[0], 'Won', 3),
    createPortfolioItem(matches[1], 'Lost', 5),
    createPortfolioItem(matches[2], 'Won', 7),
    createPortfolioItem(matches[3], 'Won', 10),
    createPortfolioItem(matches[4], 'Lost', 12),
    createPortfolioItem(matches[5], 'Won', 15),
    createPortfolioItem(matches[6], 'Lost', 20),
    createPortfolioItem(createMatch(10, teams[0], teams[2], leagues[0]), 'Won', 25),
    createPortfolioItem(createMatch(11, teams[3], teams[5], leagues[1]), 'Lost', 30),
    createPortfolioItem(createMatch(12, teams[6], teams[8], leagues[3]), 'Won', 32),
];

export const modelPerformanceData = [
    { name: 'Random Forest', accuracy: 78.5, trained: '2024-05-20' },
    { name: 'Gradient Boosting', accuracy: 81.2, trained: '2024-05-20' },
    { name: 'XGBoost', accuracy: 82.1, trained: '2024-05-21' },
    { name: 'LightGBM', accuracy: 82.5, trained: '2024-05-21' },
    { name: 'Neural Network', accuracy: 79.8, trained: '2024-05-22' },
    { name: 'Ensemble', accuracy: 83.5, trained: '2024-05-22' },
];
