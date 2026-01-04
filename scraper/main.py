
import time
import random
import json
import requests
import sys
import traceback
import re
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager

def setup_driver():
    """Sets up the Selenium WebDriver for a visible, debug-friendly environment."""
    options = webdriver.ChromeOptions()
    
    # --- Anti-Detection Measures ---
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_experimental_option("excludeSwitches", ["enable-automation"])
    options.add_experimental_option('useAutomationExtension', False)
    # Set a common user agent
    options.add_argument('user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36')

    try:
        driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)
    except Exception as e:
        print(f"Error initializing WebDriver: {e}")
        print("Ensure that Google Chrome or Chromium is installed on the system.")
        sys.exit(1)

    # Inject script to hide 'navigator.webdriver'
    driver.execute_cdp_cmd("Page.addScriptToEvaluateOnNewDocument", {
        "source": "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
    })
    
    return driver

def convert_to_decimal(odd_str: str) -> float:
    """Converts American or Decimal odds string to a decimal float."""
    try:
        # If it's already a decimal
        if '.' in odd_str:
            return float(odd_str)
        
        # American odds
        odd_val = int(odd_str)
        if odd_val > 0: # Positive odds
            return round((odd_val / 100) + 1, 2)
        else: # Negative odds
            return round((100 / abs(odd_val)) + 1, 2)
    except (ValueError, TypeError):
        # Return a value that indicates an error, e.g., 0.0 or raise an exception
        return 0.0


def scrape_odds_portal(driver, url):
    """Navigates to the URL and scrapes match data by parsing page text."""
    print(f"Navigating to {url}...")
    driver.get(url)
    
    # Increased wait time for manual CAPTCHA solving
    wait_time = 15
    print(f"Waiting for {wait_time} seconds for potential manual intervention (e.g., CAPTCHA)...")
    time.sleep(wait_time)
    
    scraped_matches = []
    
    try:
        # Get all visible text from the body
        page_text = driver.find_element(By.TAG_NAME, "body").text
        lines = page_text.split('\n')
        
        print(f"Analyzing {len(lines)} lines of text from the page.")
        
        # Regex to identify time format like XX:XX
        time_regex = re.compile(r'^\d{2}:\d{2}$')
        # Regex for both decimal (e.g., 1.23) and American odds (e.g., -110, +250)
        odd_regex = re.compile(r'^(\d+\.\d{2}|[+-]\d+)$')

        i = 0
        while i < len(lines) - 4:
            # Find a line that looks like a time
            if time_regex.match(lines[i]):
                try:
                    home_team_index = i + 1
                    
                    separator_index = -1
                    for j in range(home_team_index, min(i + 5, len(lines))):
                         if not lines[j].replace('.', '', 1).isdigit() and not lines[j][0].isalpha() and len(lines[j]) < 5 and lines[j] != '-':
                             separator_index = j
                             break
                    
                    if separator_index == -1:
                        if i + 3 < len(lines) and lines[i+2] == '-': 
                           home_team = lines[i+1]
                           away_team = lines[i+3]
                           odds_start_index = i + 4
                        else:
                           home_team = lines[i+1]
                           away_team = lines[i+2]
                           odds_start_index = i + 3
                    else:
                        home_team = " ".join(lines[home_team_index:separator_index])
                        away_team_index = separator_index + 1
                        away_team_end_index = away_team_index
                        while away_team_end_index < len(lines) and not odd_regex.match(lines[away_team_end_index]):
                            away_team_end_index += 1
                        
                        away_team = " ".join(lines[away_team_index:away_team_end_index])
                        odds_start_index = away_team_end_index

                    if not home_team or not away_team:
                        i +=1
                        continue

                    if odds_start_index + 2 < len(lines):
                        home_odd_str = lines[odds_start_index]
                        draw_odd_str = lines[odds_start_index + 1]
                        away_odd_str = lines[odds_start_index + 2]

                        if odd_regex.match(home_odd_str) and odd_regex.match(draw_odd_str) and odd_regex.match(away_odd_str):
                            home_odd = convert_to_decimal(home_odd_str)
                            draw_odd = convert_to_decimal(draw_odd_str)
                            away_odd = convert_to_decimal(away_odd_str)

                            match_data = {
                                "homeTeam": home_team.strip(),
                                "awayTeam": away_team.strip(),
                                "homeOdd": home_odd,
                                "drawOdd": draw_odd,
                                "awayOdd": away_odd,
                            }
                            scraped_matches.append(match_data)
                            print(f"  -> Scraped: {home_team} vs {away_team} | Odds: {home_odd}, {draw_odd}, {away_odd}")
                            
                            i = odds_start_index + 3
                            continue

                except (ValueError, IndexError):
                    i += 1
                    continue
            
            i += 1

    except Exception as e:
        print(f"An error occurred during scraping: {e}")
        print("--- TRACEBACK ---")
        traceback.print_exc()
        print("-----------------")
        try:
            driver.save_screenshot('error_debug.png')
            print("Screenshot 'error_debug.png' saved.")
            with open('debug.html', 'w', encoding='utf-8') as f:
                f.write(driver.page_source)
            print("Page source 'debug.html' saved for analysis.")
        except Exception as save_e:
            print(f"Could not save debug files: {save_e}")
        
    return scraped_matches

def send_data_to_api(data, api_url):
    """Sends the scraped data to the specified API endpoint."""
    if not data:
        print("No data to send.")
        return

    payload = {"matches": data}
    headers = {"Content-Type": "application/json"}
    
    print(f"\nSending {len(data)} matches to {api_url}...")
    
    try:
        response = requests.post(api_url, data=json.dumps(payload), headers=headers)
        response.raise_for_status() 
        
        print(f"API Response ({response.status_code}): {response.json()}")
        print("Data successfully sent and processed.")
        
    except requests.exceptions.RequestException as e:
        print(f"Error sending data to API: {e}")
        if e.response:
            print(f"API Response Content: {e.response.text}")

if __name__ == "__main__":
    TARGET_URL = "https://www.oddsportal.com/football/england/premier-league/"
    API_ENDPOINT = "http://localhost:9002/api/update-odds" 
    
    driver = None
    try:
        driver = setup_driver()
        scraped_data = scrape_odds_portal(driver, TARGET_URL)
        
        if not scraped_data:
            print("\nNo matches were scraped. The website structure might have changed or there are no upcoming matches.")
            try:
                with open('debug.html', 'w', encoding='utf-8') as f:
                    f.write(driver.page_source)
                print("Page source 'debug.html' saved for analysis as no matches were found.")
            except Exception as save_e:
                 print(f"Could not save debug.html file: {save_e}")
        else:
             send_data_to_api(scraped_data, API_ENDPOINT)

    except Exception as main_e:
        print(f"\nA critical error occurred in the main execution block: {main_e}")
        traceback.print_exc()

    finally:
        if driver:
            print("\nClosing browser.")
            driver.quit()
        print("Script finished.")

    