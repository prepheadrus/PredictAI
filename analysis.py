import sys
import json
import math

def poisson_probability(actual, mean):
    p = math.exp(-mean)
    for i in range(actual):
        p *= mean
        p /= (i + 1)
    return p

def analiz_et(ev_sahibi, deplasman, lig):
    # Simülasyon: Gerçek veri tabanı bağlanana kadar varsayılan gol beklentileri
    # Gelecekte buraya API'den çekilen son 5 maç istatistikleri girecek.
    ev_beklenen_gol = 1.55 
    dep_beklenen_gol = 1.15

    # Takım gücü simülasyonu (Basit ağırlıklandırma)
    if any(x in ev_sahibi for x in ["Galatasaray", "Fenerbahçe", "Beşiktaş", "City", "Madrid", "Liverpool"]):
        ev_beklenen_gol += 0.6
    if any(x in deplasman for x in ["Galatasaray", "Fenerbahçe", "Beşiktaş", "City", "Madrid", "Liverpool"]):
        dep_beklenen_gol += 0.5

    # Olasılık Hesaplamaları
    ev_gol_olasilik = [poisson_probability(i, ev_beklenen_gol) for i in range(6)]
    dep_gol_olasilik = [poisson_probability(i, dep_beklenen_gol) for i in range(6)]

    home_win_prob = 0
    draw_prob = 0
    away_win_prob = 0
    most_likely_score = [0, 0]
    max_prob = 0

    for h in range(6):
        for a in range(6):
            prob = ev_gol_olasilik[h] * dep_gol_olasilik[a]
            if h > a: home_win_prob += prob
            elif h == a: draw_prob += prob
            else: away_win_prob += prob
            
            if prob > max_prob:
                max_prob = prob
                most_likely_score = [h, a]

    sonuc = {
        "math_model": "Poisson Distribution",
        "home_win": round(home_win_prob * 100, 1),
        "draw": round(draw_prob * 100, 1),
        "away_win": round(away_win_prob * 100, 1),
        "score_prediction": f"{most_likely_score[0]} - {most_likely_score[1]}",
        "confidence": round(max_prob * 400, 1) # Güven skoru scale edildi
    }
    return json.dumps(sonuc)

if __name__ == "__main__":
    try:
        # Node.js'den gelen argümanları al
        print(analiz_et(sys.argv[1], sys.argv[2], sys.argv[3]))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
