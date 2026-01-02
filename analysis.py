
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
    return analyze_match(ev_beklenen_gol, dep_beklenen_gol, "Poisson (Fallback)", {})

def detailed_analysis(stats):
    """
    Analysis based on a hybrid model combining Poisson, Odds, Form, and Injuries.
    """
    home_stats = stats['home']
    away_stats = stats['away']
    
    # --- 1. Poisson Model ---
    home_attack_strength = (home_stats['goals_for'] / home_stats['played']) / stats['league_avg_home_goals']
    away_attack_strength = (away_stats['goals_for'] / away_stats['played']) / stats['league_avg_away_goals']
    home_defense_strength = (home_stats['goals_against'] / home_stats['played']) / stats['league_avg_away_goals']
    away_defense_strength = (away_stats['goals_against'] / away_stats['played']) / stats['league_avg_home_goals']

    home_xg_poisson = home_attack_strength * away_defense_strength * stats['league_avg_home_goals']
    away_xg_poisson = away_attack_strength * home_defense_strength * stats['league_avg_away_goals']
    
    # --- 2. Injury Model ---
    injury_factor = 0.04 
    injuries = stats.get('injuries', {'home': 0, 'away': 0})
    home_injuries = injuries.get('home', 0)
    away_injuries = injuries.get('away', 0)
    
    home_xg_poisson *= (1 - (home_injuries * injury_factor))
    away_xg_poisson *= (1 - (away_injuries * injury_factor))

    poisson_probs = calculate_outcome_probabilities(home_xg_poisson, away_xg_poisson)

    # --- 3. Odds Model ---
    odds = stats.get('odds', {})
    odds_probs = {'home_win': 0, 'draw': 0, 'away_win': 0}
    if all(k in odds for k in ['home', 'draw', 'away']) and all(v > 0 for v in odds.values()):
        total_implied = (1/odds['home']) + (1/odds['draw']) + (1/odds['away'])
        if total_implied > 0:
            odds_probs['home_win'] = (1/odds['home']) / total_implied
            odds_probs['draw'] = (1/odds['draw']) / total_implied
            odds_probs['away_win'] = (1/odds['away']) / total_implied

    # --- 4. Form Model ---
    home_form_raw = stats.get('home_form_raw', [])
    away_form_raw = stats.get('away_form_raw', [])
    home_form = [item['result'] for item in home_form_raw if 'result' in item]
    away_form = [item['result'] for item in away_form_raw if 'result' in item]
    
    form_points = {'W': 3, 'D': 1, 'L': 0}
    home_form_score = sum(form_points.get(r, 0) for r in home_form)
    away_form_score = sum(form_points.get(r, 0) for r in away_form)
    
    form_probs = {'home_win': 0.33, 'draw': 0.33, 'away_win': 0.33}
    total_form_score = home_form_score + away_form_score
    if total_form_score > 0:
        home_form_adv = 0.55 # Small home advantage factor in form calculation
        total_points_for_dist = home_form_score + away_form_score
        if total_points_for_dist > 0:
            form_probs['home_win'] = (home_form_score / total_points_for_dist) * (1 - home_form_adv) + home_form_adv * 0.5
            form_probs['away_win'] = (away_form_score / total_points_for_dist) * (1- home_form_adv)
            form_probs['draw'] = 1 - form_probs['home_win'] - form_probs['away_win']


    # --- 5. Hybrid Model (Weighted Average) ---
    weights = {'poisson': 0.5, 'odds': 0.3, 'form': 0.2}
    # If odds are not available, re-distribute its weight to poisson and form
    if not odds_probs['home_win']:
        weights['poisson'] += 0.2
        weights['form'] += 0.1
        weights['odds'] = 0

    final_home_win = (poisson_probs['home_win'] * weights['poisson']) + (odds_probs['home_win'] * weights['odds']) + (form_probs['home_win'] * weights['form'])
    final_draw = (poisson_probs['draw'] * weights['poisson']) + (odds_probs['draw'] * weights['odds']) + (form_probs['draw'] * weights['form'])
    final_away_win = (poisson_probs['away_win'] * weights['poisson']) + (odds_probs['away_win'] * weights['odds']) + (form_probs['away_win'] * weights['form'])

    total_final_prob = final_home_win + final_draw + final_away_win
    if total_final_prob > 0:
        final_home_win /= total_final_prob
        final_draw /= total_final_prob
        final_away_win /= total_final_prob

    _, _, _, most_likely_score, max_prob = calculate_outcome_probabilities(home_xg_poisson, away_xg_poisson, return_details=True)
    confidence = (max(final_home_win, final_draw, final_away_win) - (1/3)) * 150 
    confidence = min(99.0, max(10.0, confidence))

    detailed_stats = {
        "home_attack": round(home_attack_strength, 2),
        "away_attack": round(away_attack_strength, 2),
        "home_defense": round(home_defense_strength, 2),
        "away_defense": round(away_defense_strength, 2),
        "home_xg_poisson": round(home_xg_poisson, 2),
        "away_xg_poisson": round(away_xg_poisson, 2),
        "home_form_points": home_form_score,
        "away_form_points": away_form_score,
        "home_injuries": home_injuries,
        "away_injuries": away_injuries
    }
    
    sonuc = {
        "math_model": "Hybrid (Poisson, Odds, Form, Injury)",
        "home_win": round(final_home_win * 100, 1),
        "draw": round(final_draw * 100, 1),
        "away_win": round(final_away_win * 100, 1),
        "score_prediction": f"{most_likely_score[0]} - {most_likely_score[1]}",
        "confidence": round(confidence, 1),
        "stats": detailed_stats
    }
    return json.dumps(sonuc)


def calculate_outcome_probabilities(home_xg, away_xg, return_details=False):
    """Calculates win/draw/loss probabilities from xG."""
    home_goal_probs = [poisson_probability(i, home_xg) for i in range(7)]
    away_goal_probs = [poisson_probability(i, away_xg) for i in range(7)]

    sum_home = sum(home_goal_probs)
    sum_away = sum(away_goal_probs)
    if sum_home > 0: home_goal_probs = [p / sum_home for p in home_goal_probs]
    if sum_away > 0: away_goal_probs = [p / sum_away for p in away_goal_probs]

    home_win_prob, draw_prob, away_win_prob = 0, 0, 0
    most_likely_score, max_prob = [0, 0], 0

    for h in range(7):
        for a in range(7):
            prob = home_goal_probs[h] * away_goal_probs[a]
            if prob > max_prob:
                max_prob = prob
                most_likely_score = [h, a]
            if h > a: home_win_prob += prob
            elif h == a: draw_prob += prob
            else: away_win_prob += prob
            
    total_prob = home_win_prob + draw_prob + away_win_prob
    if total_prob > 0:
        home_win_prob /= total_prob
        draw_prob /= total_prob
        away_win_prob /= total_prob
    
    if return_details:
        return home_win_prob, draw_prob, away_win_prob, most_likely_score, max_prob
    
    return {"home_win": home_win_prob, "draw": draw_prob, "away_win": away_win_prob}


def analyze_match(ev_beklenen_gol, dep_beklenen_gol, model_name, strength_stats):
    """Legacy match analysis logic using only Poisson distribution."""
    home_win_prob, draw_prob, away_win_prob, most_likely_score, max_prob = calculate_outcome_probabilities(
        ev_beklenen_gol, dep_beklenen_gol, return_details=True
    )

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
        import traceback
        print(json.dumps({"error": str(e), "trace": traceback.format_exc()}))

    