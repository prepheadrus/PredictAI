
import time
import random
import json
import requests
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager

def setup_driver():
    """Sets up the Selenium WebDriver with anti-detection options."""
    options = webdriver.ChromeOptions()
    # Anti-detection measures
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_experimental_option("excludeSwitches", ["enable-automation"])
    options.add_experimental_option('useAutomationExtension', False)
    
    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)
    
    # Inject script to undefine navigator.webdriver
    driver.execute_cdp_cmd("Page.addScriptToEvaluateOnNewDocument", {
        "source": "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
    })
    
    return driver

def scrape_odds_portal(driver, url):
    """Navigates to the URL, scrolls, and scrapes match data."""
    print(f"Navigating to {url}...")
    driver.get(url)
    
    # Wait for the main content to be somewhat loaded
    initial_wait = random.uniform(5, 8)
    print(f"Waiting for {initial_wait:.2f} seconds for initial page load...")
    time.sleep(initial_wait)
    
    # Scroll down to load lazy-loaded content
    print("Scrolling down to load all matches...")
    try:
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        time.sleep(random.uniform(2, 4))
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        time.sleep(random.uniform(2, 3))
    except Exception as e:
        print(f"Could not scroll page: {e}")

    scraped_matches = []
    
    try:
        # Wait for event rows to be present
        WebDriverWait(driver, 20).until(
            EC.presence_of_all_elements_located((By.CSS_SELECTOR, "div.flex.items-center.min-h-11.border-b.border-black-main-30"))
        )
        
        # Find all match rows. This selector is more robust.
        match_rows = driver.find_elements(By.CSS_SELECTOR, "div.flex.items-center.min-h-11.border-b.border-black-main-30")
        print(f"Found {len(match_rows)} potential match rows.")

        for row in match_rows:
            try:
                row_text = row.text
                if not row_text or '\n' not in row_text:
                    continue

                # Basic validation to see if it's a match row
                parts = row_text.split('\n')
                if len(parts) < 5: # Expecting at least time, teams, and odds
                    continue

                # Find team names - they are usually in a specific nested div
                team_elements = row.find_elements(By.CSS_SELECTOR, "p.participant-name")
                if len(team_elements) != 2:
                    continue
                
                home_team = team_elements[0].text
                away_team = team_elements[1].text

                # Find odds - they are in specific divs with a common class
                odd_elements = row.find_elements(By.CSS_SELECTOR, "div.h-7")
                
                # Check for at least 3 odds (1, X, 2)
                if len(odd_elements) >= 3:
                    try:
                        home_odd = float(odd_elements[0].text)
                        draw_odd = float(odd_elements[1].text)
                        away_odd = float(odd_elements[2].text)
                    except (ValueError, IndexError):
                        # Skip if odds are not valid numbers
                        continue
                        
                    match_data = {
                        "homeTeam": home_team.strip(),
                        "awayTeam": away_team.strip(),
                        "homeOdd": home_odd,
                        "drawOdd": draw_odd,
                        "awayOdd": away_odd,
                    }
                    scraped_matches.append(match_data)
                    print(f"  -> Scraped: {home_team} vs {away_team} | Odds: {home_odd}, {draw_odd}, {away_odd}")

            except Exception as e:
                # This prevents one bad row from stopping the whole script
                # print(f"Could not process a row: {e}")
                continue
                
    except Exception as e:
        print(f"An error occurred during scraping: {e}")
        
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
        response.raise_for_status()  # Raise an exception for bad status codes (4xx or 5xx)
        
        print(f"API Response ({response.status_code}): {response.json()}")
        print("Data successfully sent and processed.")
        
    except requests.exceptions.RequestException as e:
        print(f"Error sending data to API: {e}")
        if e.response:
            print(f"API Response Content: {e.response.text}")

if __name__ == "__main__":
    TARGET_URL = "https://www.oddsportal.com/football/england/premier-league/"
    # The Next.js dev server runs on port 9002 in this environment
    API_ENDPOINT = "http://localhost:9002/api/update-odds" 
    
    driver = setup_driver()
    
    try:
        scraped_data = scrape_odds_portal(driver, TARGET_URL)
        if scraped_data:
            send_data_to_api(scraped_data, API_ENDPOINT)
        else:
            print("\nNo matches were scraped. The website structure might have changed or there are no upcoming matches.")
    finally:
        print("\nClosing browser.")
        driver.quit()
        print("Script finished.")

    