import requests
from bs4 import BeautifulSoup
from functools import lru_cache

@lru_cache(maxsize=10)
def fetch_wikivoyage_page(city: str) -> str:
    """
    Fetches the Wikivoyage page for a given city and extracts the main text.
    Results are cached to avoid redundant network calls during parallel execution.
    """
    url = f"https://en.wikivoyage.org/wiki/{city}"
    headers = {"User-Agent": "JapanTripPlanner/1.0 (https://github.com/; contact@example.com)"}
    try:
        response = requests.get(url, timeout=10, headers=headers)
        if response.status_code != 200:
            return f"Failed to fetch Wikivoyage data for {city}. Status code: {response.status_code}"
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # The main content of mediawiki pages is usually in mw-content-text
        content = soup.find(id="mw-content-text")
        
        if not content:
            return f"Could not find main content on Wikivoyage for {city}."
            
        # Extract text, remove scripts and styles
        for script_or_style in content(["script", "style"]):
            script_or_style.decompose()
            
        text = content.get_text(separator=' ', strip=True)
        return text
    except Exception as e:
        return f"Error fetching Wikivoyage data for {city}: {str(e)}"
