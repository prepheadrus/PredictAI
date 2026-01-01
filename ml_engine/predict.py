import sys
import json
import sqlite3
import os

def get_prediction(home_team_id, away_team_id):
    """
    Generates a mock prediction for a match between two teams.
    In a real scenario, this function would load a trained model and
    use team data from the database to make a prediction.
    """
    # For now, we are not using the database, but this is how you would connect:
    # db_path = os.path.join(os.path.dirname(__file__), '..', 'bahis.db')
    # try:
    #     conn = sqlite3.connect(db_path)
    #     cursor = conn.cursor()
    #     # Example query:
    #     # cursor.execute("SELECT * FROM teams WHERE id = ? OR id = ?", (home_team_id, away_team_id))
    #     # teams_data = cursor.fetchall()
    #     conn.close()
    # except sqlite3.Error as e:
    #     return {
    #         "error": f"Database error: {e}"
    #     }

    # Mock prediction logic
    confidence = 50 + (int(home_team_id) % 10) * 5 - (int(away_team_id) % 10) * 2
    if confidence > 66:
        prediction = "HOME_WIN"
    elif confidence < 33:
        prediction = "AWAY_WIN"
    else:
        prediction = "DRAW"
        
    analysis = (
        f"Mock analysis based on team IDs. The model favors the home team due to its "
        f"hypothetical strong offensive record (ID: {home_team_id}). "
        f"The away team (ID: {away_team_id}) has a weaker defense in this simulation. "
        f"Confidence is calculated at {confidence:.2f}%."
    )

    return {
        "prediction": prediction,
        "confidence": round(confidence),
        "analysis": analysis
    }

if __name__ == '__main__':
    if len(sys.argv) != 3:
        print(json.dumps({"error": "Usage: predict.py <home_team_id> <away_team_id>"}), file=sys.stderr)
        sys.exit(1)

    home_id = sys.argv[1]
    away_id = sys.argv[2]
    
    result = get_prediction(home_id, away_id)
    
    # Ensure only the JSON is printed to stdout
    print(json.dumps(result))
