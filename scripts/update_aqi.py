import requests
import json
import math
import os
from datetime import datetime

# 1. SETTINGS & SECRETS
# Use the key as an environment variable (for GitHub Actions) or a fallback for local testing
API_KEY = os.environ.get("DATA_GOV_KEY", "579b464db66ec23bdd0000011b110078a7cd41824c3e6c669d56f65c")
GEOJSON_PATH = "public/delhi_wards.geojson"
OUTPUT_DIR = "public/data"
OUTPUT_PATH = os.path.join(OUTPUT_DIR, "ward_aqi.json")

# Ensure output directory exists
if not os.path.exists(OUTPUT_DIR):
    os.makedirs(OUTPUT_DIR)

def haversine(lat1, lon1, lat2, lon2):
    R = 6371  # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def fetch_live_stations():
    print(f"📡 Fetching live stations from data.gov.in...")
    # Use the user's specific query parameters
    url = f"https://api.data.gov.in/resource/3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69?api-key={API_KEY}&format=json&filters[state]=Delhi&limit=200"
    
    try:
        response = requests.get(url)
        data = response.json()
        records = data.get('records', [])
        
        station_data = {}
        for r in records:
            name = r.get('station')
            lat_str = r.get('latitude', '0')
            lng_str = r.get('longitude', '0')
            
            try:
                lat = float(lat_str)
                lng = float(lng_str)
                aqi = int(r.get('avg_value', '0')) if r.get('avg_value') else 0
            except (ValueError, TypeError):
                continue

            if lat == 0 or lng == 0: continue
            
            # Group by station to get maximum pollutant index (CPCB standard)
            if name not in station_data or aqi > station_data[name]['aqi']:
                station_data[name] = {'lat': lat, 'lng': lng, 'aqi': aqi}

        return list(station_data.values())
    except Exception as e:
        print(f"❌ Error fetching API: {e}")
        return []

def update_ward_predictions():
    # Load Stations
    stations = fetch_live_stations()
    if not stations: 
        print("⚠️ No station data found. Creating dummy fallback data to keep system alive.")
        stations = [{'lat': 28.61, 'lng': 77.20, 'aqi': 150}] # Fallback to Delhi Central
    
    print(f"✅ Found {len(stations)} station data points.")

    # Load Wards
    if not os.path.exists(GEOJSON_PATH):
        print(f"❌ GeoJSON not found at {GEOJSON_PATH}")
        return
        
    with open(GEOJSON_PATH, 'r') as f:
        geojson = json.load(f)

    ward_results = {}
    
    for feature in geojson['features']:
        props = feature['properties']
        # Try different possible ward name fields
        ward_name = props.get('Ward_Name') or props.get('WARD_NAME') or props.get('name') or props.get('Ward_No', 'Unknown')
        ward_name = str(ward_name).strip() if ward_name else None
        
        if not ward_name:
            print(f"⚠️ Skipping invalid ward mapping")
            continue
        # Get coordinate for distance calculation
        geom = feature['geometry']
        if geom['type'] == 'Polygon':
            lng, lat = geom['coordinates'][0][0]
        elif geom['type'] == 'MultiPolygon':
            lng, lat = geom['coordinates'][0][0][0]
        else:
            continue

        # Inverse Distance Weighting (IDW) Prediction
        weighted_aqi_sum = 0
        total_weight = 0
        
        # Calculate distances to all stations
        for s in stations:
            dist = haversine(lat, lng, s['lat'], s['lng'])
            weight = 1.0 / max(dist, 0.1) # Avoid division by zero
            weighted_aqi_sum += s['aqi'] * weight
            total_weight += weight

        predicted_aqi = weighted_aqi_sum / total_weight if total_weight > 0 else 150

        try:
            ward_results[ward_name.upper()] = {
                "aqi": round(predicted_aqi),
                "status": "SEVERE" if predicted_aqi > 300 else "POOR" if predicted_aqi > 200 else "MODERATE",
                "lastUpdated": datetime.now().strftime("%Y-%m-%d %H:%M")
            }
        except Exception as e:
            print(f"❌ Error processing ward: {ward_name}, error: {e}")

    # Save to JSON
    with open(OUTPUT_PATH, 'w') as f:
        json.dump(ward_results, f, indent=2)
    
    # NEW: SUPABASE INTEGRATION
    SUPABASE_URL = os.environ.get("SUPABASE_URL")
    SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

    if SUPABASE_URL and SUPABASE_KEY:
        try:
            from supabase import create_client, Client
            supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
            
            # Convert results to a list for Supabase upsert
            supabase_records = []
            for ward_name, data in ward_results.items():
                supabase_records.append({
                    "ward_name": ward_name,
                    "aqi": data["aqi"],
                    "status": data["status"],
                    "last_updated": datetime.now().isoformat()
                })
            
            # Batch upsert into ward_aqi table
            print(f"📡 Syncing {len(supabase_records)} wards to Supabase...")
            supabase.table("ward_aqi").upsert(supabase_records, on_conflict="ward_name").execute()
            print("🚀 Supabase sync complete!")
        except Exception as e:
            print(f"❌ Supabase sync failed: {e}")
    else:
        print("ℹ️ Skipping Supabase sync (secrets not configured)")

    print(f"🚀 Saved fresh results for {len(ward_results)} wards to {OUTPUT_PATH}")

if __name__ == "__main__":
    update_ward_predictions()
