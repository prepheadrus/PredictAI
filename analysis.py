import sys
import json
import math
import random

def get_team_strength(team_name):
    """Generates a consistent strength value for a team based on its name."""
    # Use the sum of character codes to create a consistent seed
    seed = sum(ord(char) for char in team_name)
    r = random.Random(seed)
    # Generate a strength value between 0.8 and 2.2
    return r.uniform(0.8, 2.2)

def poisson_probability(actual, mean):
    """Calculates the poisson probability of a number of events occurring."""
    if mean < 0: return 0
    try:
        return (mean**actual * math.exp(-mean)) / math.factorial(actual)
    except (OverflowError, ValueError):
        # Fallback for large numbers where factorial might fail
        # Using a simpler approximation or returning 0
        return 0


def analiz_et(ev_sahibi, deplasman, lig):
    # Get dynamic strength values for each team
    home_strength = get_team_strength(ev_sahibi)
    away_strength = get_team_strength(deplasman)

    # Base expected goals, adjusted by team strength
    # Added a slight home advantage
    ev_beklenen_gol = 1.4 * home_strength / away_strength + 0.15
    dep_beklenen_gol = 1.2 * away_strength / home_strength

    # Probability Calculations
    ev_gol_olasilik = [poisson_probability(i, ev_beklenen_gol) for i in range(7)]
    dep_gol_olasilik = [poisson_probability(i, dep_beklenen_gol) for i in range(7)]

    # Normalize probabilities to ensure they sum to 1 (or close to it)
    sum_ev = sum(ev_gol_olasilik)
    sum_dep = sum(dep_gol_olasilik)
    if sum_ev > 0: ev_gol_olasilik = [p / sum_ev for p in ev_gol_olasilik]
    if sum_dep > 0: dep_gol_olasilik = [p / sum_dep for p in dep_gol_olasilik]


    home_win_prob = 0
    draw_prob = 0
    away_win_prob = 0
    most_likely_score = [0, 0]
    max_prob = 0

    for h in range(7):
        for a in range(7):
            prob = ev_gol_olasilik[h] * dep_gol_olasilik[a]
            if h > a: home_win_prob += prob
            elif h == a: draw_prob += prob
            else: away_win_prob += prob
            
            if prob > max_prob:
                max_prob = prob
                most_likely_score = [h, a]

    # Final normalization of win/draw/loss probabilities
    total_prob = home_win_prob + draw_prob + away_win_prob
    if total_prob > 0:
        home_win_prob /= total_prob
        draw_prob /= total_prob
        away_win_prob /= total_prob

    # Calculate confidence based on the probability of the most likely score
    # and the difference between win/loss probabilities.
    confidence = (max_prob + abs(home_win_prob - away_win_prob)) * 50
    confidence = min(99.0, max(10.0, confidence)) # Clamp between 10% and 99%

    sonuc = {
        "math_model": "Poisson Distribution (Dynamic)",
        "home_win": round(home_win_prob * 100, 1),
        "draw": round(draw_prob * 100, 1),
        "away_win": round(away_win_prob * 100, 1),
        "score_prediction": f"{most_likely_score[0]} - {most_likely_score[1]}",
        "confidence": round(confidence, 1)
    }
    return json.dumps(sonuc)

if __name__ == "__main__":
    try:
        # Node.js'den gelen argümanları al
        print(analiz_et(sys.argv[1], sys.argv[2], sys.argv[3]))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
