
import sys
import json
import math
import random

def poisson_probability(actual, mean):
    """Calculates the poisson probability of a number of events occurring."""
    if mean < 0: return 0
    try:
        return (mean**actual * math.exp(-mean)) / math.factorial(actual)
    except (OverflowError, ValueError):
        return 0

def get_team_strength(team_name):
    """Generates a consistent strength value for a team based on its name."""
    seed = sum(ord(char) for char in team_name)
    r = random.Random(seed)
    return r.uniform(0.8, 2.2)

def fallback_analysis(ev_sahibi, deplasman):
    """Fallback analysis if detailed stats are not provided."""
    home_strength = get_team_strength(ev_sahibi)
    away_strength = get_team_strength(deplasman)
    ev_beklenen_gol = 1.4 * home_strength / away_strength + 0.15
    dep_beklenen_gol = 1.2 * away_strength / home_strength
    return analyze_match(ev_beklenen_gol, dep_beklenen_gol, "Poisson Distribution (Fallback)", {})

def detailed_analysis(stats):
    """Analysis based on detailed team and league stats."""
    home_stats = stats['home']
    away_stats = stats['away']
    
    # Calculate Attack Strength
    home_attack_strength = (home_stats['goals_for'] / home_stats['played']) / stats['league_avg_home_goals']
    away_attack_strength = (away_stats['goals_for'] / away_stats['played']) / stats['league_avg_away_goals']

    # Calculate Defense Strength
    home_defense_strength = (home_stats['goals_against'] / home_stats['played']) / stats['league_avg_away_goals']
    away_defense_strength = (away_stats['goals_against'] / away_stats['played']) / stats['league_avg_home_goals']

    # Calculate Expected Goals (xG)
    ev_beklenen_gol = home_attack_strength * away_defense_strength * stats['league_avg_home_goals']
    dep_beklenen_gol = away_attack_strength * home_defense_strength * stats['league_avg_away_goals']
    
    strength_stats = {
        "home_attack": round(home_attack_strength, 2),
        "away_attack": round(away_attack_strength, 2),
        "home_defense": round(home_defense_strength, 2),
        "away_defense": round(away_defense_strength, 2)
    }

    return analyze_match(ev_beklenen_gol, dep_beklenen_gol, "Poisson Distribution (Advanced Stats)", strength_stats)


def analyze_match(ev_beklenen_gol, dep_beklenen_gol, model_name, strength_stats):
    """Core match analysis logic using Poisson distribution."""
    ev_gol_olasilik = [poisson_probability(i, ev_beklenen_gol) for i in range(7)]
    dep_gol_olasilik = [poisson_probability(i, dep_beklenen_gol) for i in range(7)]

    sum_ev = sum(ev_gol_olasilik)
    sum_dep = sum(dep_gol_olasilik)
    if sum_ev > 0: ev_gol_olasilik = [p / sum_ev for p in ev_gol_olasilik]
    if sum_dep > 0: dep_gol_olasilik = [p / sum_dep for p in dep_gol_olasilik]

    home_win_prob, draw_prob, away_win_prob = 0, 0, 0
    most_likely_score, max_prob = [0, 0], 0

    for h in range(7):
        for a in range(7):
            prob = ev_gol_olasilik[h] * dep_gol_olasilik[a]
            if h > a: home_win_prob += prob
            elif h == a: draw_prob += prob
            else: away_win_prob += prob
            
            if prob > max_prob:
                max_prob = prob
                most_likely_score = [h, a]

    total_prob = home_win_prob + draw_prob + away_win_prob
    if total_prob > 0:
        home_win_prob /= total_prob
        draw_prob /= total_prob
        away_win_prob /= total_prob

    confidence = (max_prob + abs(home_win_prob - away_win_prob)) * 50
    confidence = min(99.0, max(10.0, confidence))

    sonuc = {
        "math_model": model_name,
        "home_win": round(home_win_prob * 100, 1),
        "draw": round(draw_prob * 100, 1),
        "away_win": round(away_win_prob * 100, 1),
        "score_prediction": f"{most_likely_score[0]} - {most_likely_score[1]}",
        "confidence": round(confidence, 1),
        "stats": {
            "home_xg": round(ev_beklenen_gol, 2),
            "away_xg": round(dep_beklenen_gol, 2),
            **strength_stats
        }
    }
    return json.dumps(sonuc)

if __name__ == "__main__":
    try:
        if len(sys.argv) == 2 and sys.argv[1].startswith('{'):
            stats = json.loads(sys.argv[1])
            if stats.get("is_simulation", True):
                print(fallback_analysis(stats.get("home_name", "Team A"), stats.get("away_name", "Team B")))
            else:
                print(detailed_analysis(stats))
        else:
            print(fallback_analysis("Team A", "Team B"))
            
    except Exception as e:
        print(json.dumps({"error": str(e)}))

    