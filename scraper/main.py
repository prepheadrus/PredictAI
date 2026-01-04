
import time
import random
import json
import requests
import sys
import traceback
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

    # REMOVED for local debugging: --headless=new, --no-sandbox, --disable-dev-shm-usage

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

def scrape_odds_portal(driver, url):
    """Navigates to the URL and scrapes match data."""
    print(f"Navigating to {url}...")
    driver.get(url)
    
    # Increased wait time for manual CAPTCHA solving
    wait_time = 15
    print(f"Waiting for {wait_time} seconds for potential manual intervention (e.g., CAPTCHA)...")
    time.sleep(wait_time)
    
    scraped_matches = []
    
    try:
        # Wait for event rows to be present
        WebDriverWait(driver, 20).until(
            EC.presence_of_all_elements_located((By.CSS_SELECTOR, "div.flex.items-center.min-h-11"))
        )
        
        # Find all potential match rows
        match_rows = driver.find_elements(By.CSS_SELECTOR, "div.flex.items-center.min-h-11")
        print(f"Found {len(match_rows)} potential match rows.")

        for row in match_rows:
            try:
                # Find team names
                team_elements = row.find_elements(By.CSS_SELECTOR, "p.participant-name")
                if len(team_elements) != 2:
                    continue # Not a valid match row
                
                home_team = team_elements[0].text
                away_team = team_elements[1].text

                # Find odds elements
                odd_elements = row.find_elements(By.CSS_SELECTOR, "div.h-7")
                
                if len(odd_elements) >= 3:
                    try:
                        home_odd = float(odd_elements[0].text)
                        draw_odd = float(odd_elements[1].text)
                        away_odd = float(odd_elements[2].text)
                    except (ValueError, IndexError):
                        continue # Skip if odds are not valid numbers
                        
                    match_data = {
                        "homeTeam": home_team.strip(),
                        "awayTeam": away_team.strip(),
                        "homeOdd": home_odd,
                        "drawOdd": draw_odd,
                        "awayOdd": away_odd,
                    }
                    scraped_matches.append(match_data)
                    print(f"  -> Scraped: {home_team} vs {away_team} | Odds: {home_odd}, {draw_odd}, {away_odd}")

            except Exception:
                # Prevents one bad row from stopping the whole script
                continue
                
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
    # In Google IDX, the Next.js dev server typically runs on port 3000
    # Make sure this port matches your local dev server port
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

    