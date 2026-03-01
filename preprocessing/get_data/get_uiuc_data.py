import time
from pathlib import Path

import pandas as pd
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import Select

def scrape_uiuc_crime_log():
    # 1. Set up a headless Chrome browser
    options = webdriver.ChromeOptions()
    options.add_argument('--headless') # Run in the background without opening a window
    options.add_argument('--disable-gpu')
    options.add_argument('--no-sandbox')
    
    print("Launching browser...")
    driver = webdriver.Chrome(options=options)
    
    try:
        # 2. Navigate to the UIUC Police Blotter page
        url = "https://police.illinois.edu/crime-stats-and-clery/daily-crime-log-and-police-blotter/"
        print(f"Fetching data from {url}...")
        driver.get(url)
        
        # Wait a few seconds for the JavaScript table to fully render
        time.sleep(3) 
        
        # 3. Change the "Show [ 25 ] entries" dropdown to "All" 
        # This forces the table to load all rows into the HTML at once, rather than just the first page.
        try:
            # Locate the dropdown menu (select element) associated with the table length
            select_element = driver.find_element(By.TAG_NAME, 'select')
            select = Select(select_element)
            select.select_by_visible_text('All')
            print("Selected 'All' entries. Waiting for table to expand...")
            time.sleep(3) # Wait for the table to refresh with all rows
        except Exception as e:
            print("Warning: Could not find or interact with the 'Show All' dropdown. Only extracting visible rows.")
            
        # 4. Extract the rendered HTML page source
        soup = BeautifulSoup(driver.page_source, 'html.parser')
        
        # 5. Use pandas to find and parse all HTML tables into a list of DataFrames
        tables = pd.read_html(str(soup))
        
        # Loop through found tables and grab the one that looks like the crime log
        crime_df = None
        for tbl in tables:
            # Identify the correct table by checking for a known column header
            if 'Reported Date/Time' in tbl.columns:
                crime_df = tbl
                break
                
        # 6. Save the target table to a CSV file
        if crime_df is not None:
            output_path = Path(__file__).resolve().parent.parent / "crime_logs" / "001775_uiuc.csv"
            output_path.parent.mkdir(parents=True, exist_ok=True)
            crime_df.to_csv(output_path, index=False)
            print(f"Success! Saved {len(crime_df)} records to '{output_path}'.")
        else:
            print("Error: Could not find the crime log table on the page.")
            
    finally:
        # Always close the browser when finished
        driver.quit()

if __name__ == "__main__":
    scrape_uiuc_crime_log()