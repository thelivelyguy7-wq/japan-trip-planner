import os
import requests
from functools import lru_cache
from dotenv import load_dotenv

load_dotenv()

@lru_cache(maxsize=20)
def search_google(query: str) -> str:
    """
    Calls the Google Custom Search JSON API and returns a concatenated string of snippets.
    """
    api_key = os.environ.get("GOOGLE_SEARCH_API_KEY")
    cse_id = os.environ.get("GOOGLE_CSE_ID")
    
    if not api_key or not cse_id or api_key == "your_google_search_api_key_here":
        return f"Mock search result for '{query}': Currently open and highly rated."
        
    url = "https://www.googleapis.com/customsearch/v1"
    params = {
        "key": api_key,
        "cx": cse_id,
        "q": query,
        "num": 3  # Get top 3 results
    }
    
    try:
        response = requests.get(url, params=params, timeout=10)
        if response.status_code == 200:
            data = response.json()
            items = data.get("items", [])
            snippets = [item.get("snippet", "") for item in items]
            if snippets:
                return " ".join(snippets)
            return "No results found."
        else:
            return f"Search API error: {response.status_code}"
    except Exception as e:
        return f"Search exception: {str(e)}"
