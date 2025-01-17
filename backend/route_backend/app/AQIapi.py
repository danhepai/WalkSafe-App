import requests
import numpy as np
import pandas as pd
import json
import os

"""
Creates a 100 point meshgrid of coordinates based on max and min coordinate of the city
Output: coordinates, which are inspected in qgis for correctness
"""


def create_point_space():
    # Define the bounding box for Cluj-Napoca, Romania (approximate coordinates)
    bounding_box = {
        "min_lat": 46.7300,  # Southernmost latitude
        "max_lat": 46.8000,  # Northernmost latitude
        "min_lon": 23.5000,  # Westernmost longitude
        # TODO:adjust this
        "max_lon": 23.7100,  # Easternmost longitude
    }

    # Calculate the number of points along each axis
    # Approximately
    total_points = 100
    lat_range = bounding_box["max_lat"] - bounding_box["min_lat"]
    lon_range = bounding_box["max_lon"] - bounding_box["min_lon"]
    aspect_ratio = lat_range / lon_range
    num_lat_points = int(np.sqrt(total_points * aspect_ratio))
    num_lon_points = int(total_points / num_lat_points)

    # Generate the grid of coordinates
    latitudes = np.linspace(bounding_box["min_lat"], bounding_box["max_lat"], num_lat_points)
    longitudes = np.linspace(bounding_box["min_lon"], bounding_box["max_lon"], num_lon_points)
    coordinates = [(lat, lon) for lat in latitudes for lon in longitudes]

    print(len(coordinates))
    data = pd.DataFrame(coordinates)
    file_name = "../resources/coordinates_for_aqi.csv"
    data.to_csv(file_name)

    return data


"""
Sending requests to the AQI api
INPUT: latitude and longitude
OUTPUT: -response json data,
        -error code
"""


def create_requests_for_each_points(lat, lon):
    url = "https://airquality.googleapis.com/v1/currentConditions:lookup?key="

    payload = {
        "universalAqi": True,
        "location": {
            "latitude": lat,
            "longitude": lon
        },
        "extraComputations": [
            "HEALTH_RECOMMENDATIONS",
            "DOMINANT_POLLUTANT_CONCENTRATION",
            "POLLUTANT_CONCENTRATION",
            "LOCAL_AQI",
            "POLLUTANT_ADDITIONAL_INFO"
        ]
    }

    # Set headers for POST request
    headers = {
        "Content-Type": "application/json"
    }
    try:
        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status()
        data = response.json()
        return data
    except requests.exceptions.RequestException as e:
        print(f"Error fetching data; {e} ")
        return None


def output_into_file(data):
    json_data = json.dumps(data, indent=4)

    # print(json_data)

    with open("../resources/aqi_data", "w") as json_file:
        json_file.write(json_data)


"""
Getting all the responses and creating a json array.
INPUT: data - key, latitude, longitude

"""


def running_on_data(data):
    # create_requests_for_each_points(46.795890,23.628894)
    # print(data)
    final_data = []
    for key, value in data.iterrows():
        response = create_requests_for_each_points(value[0], value[1])
        # print(key,response)
        final_data.append(response)
    output_into_file(final_data)


def main():
    data = create_point_space()
    filepath = "../resources/aqi_data.json"
    """
    This if is for not overusing the API, in future we can calculate per day how many time do we ask for AQI data.
    Saving cost is key.
    """
    if not os.path.exists(filepath):
        running_on_data(data)


main()
