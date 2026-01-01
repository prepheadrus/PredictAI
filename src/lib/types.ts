import type { InferSelectModel } from "drizzle-orm";
import type { matches, teams } from "@/db/schema";

export interface League {
  id: number;
  name: string;
  country: string;
}

// export interface Team {
//   id: number;
//   name: string;
//   logoUrl: string;
// }

export type Team = InferSelectModel<typeof teams>;

export type MatchWithTeams = InferSelectModel<typeof matches> & {
    homeTeam: Team | null;
    awayTeam: Team | null;
}

export interface Match {
  id: number;
  homeTeam: Team;
  awayTeam: Team;
  date: string;
  league: League;
  prediction: 'Home' | 'Draw' | 'Away';
  confidence: number;
  odds: {
    home: number;
    draw: number;
    away: number;
  };
  status: 'Pending' | 'Won' | 'Lost';
  result?: {
    homeScore: number;
    awayScore: number;
  };
  h2h: Match[];
  homeTeamForm: ('W' | 'D' | 'L')[];
  awayTeamForm: ('W' | 'D' | 'L')[];
}

export interface PortfolioItem extends Match {
  betOn: 'Home' | 'Draw' | 'Away';
  staked: number;
  profit: number;
}
