import requests
from functools import lru_cache

@lru_cache(maxsize=1)
def get_exchange_rate(base: str = 'USD', target: str = 'JPY') -> float:
    """
    Fetches the latest exchange rate from the free Frankfurter API.
    """
    try:
        url = f"https://api.frankfurter.app/latest?from={base}&to={target}"
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            data = response.json()
            return data["rates"].get(target, 0.0)
        return 0.0
    except Exception:
        # Fallback to a mock rate if the API fails
        if target == 'JPY':
            return 150.0
        return 1.0
