import os
import googlemaps
from functools import lru_cache
from dotenv import load_dotenv

load_dotenv()

@lru_cache(maxsize=50)
def get_travel_time(origin: str, destination: str) -> str:
    """
    Calls the Google Maps Distance Matrix API to calculate travel time.
    """
    api_key = os.environ.get("GOOGLE_MAPS_API_KEY")
    
    if not api_key or api_key == "your_google_maps_api_key_here":
        return f"Mock travel time: 30 mins by transit from {origin} to {destination}."
        
    try:
        gmaps = googlemaps.Client(key=api_key)
        
        # Calculate transit time
        matrix = gmaps.distance_matrix(
            origins=[origin],
            destinations=[destination],
            mode="transit"
        )
        
        if matrix['status'] == 'OK':
            element = matrix['rows'][0]['elements'][0]
            if element['status'] == 'OK':
                duration = element['duration']['text']
                return f"{duration} by transit"
            elif element['status'] == 'ZERO_RESULTS':
                # Fallback to driving if transit fails
                matrix_driving = gmaps.distance_matrix(
                    origins=[origin],
                    destinations=[destination],
                    mode="driving"
                )
                if matrix_driving['status'] == 'OK':
                    elem_drive = matrix_driving['rows'][0]['elements'][0]
                    if elem_drive['status'] == 'OK':
                        return f"{elem_drive['duration']['text']} by driving"
                        
        return "Travel time calculation failed."
    except Exception as e:
        return f"Maps exception: {str(e)}"
