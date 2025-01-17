import requests
import json
import os
import time
import csv
import geopandas as gpd
from shapely.geometry import LineString, Point

json_data = None
filepath = None

"""
Sending requests to waze and getting traffic data
Output: - data json
"""


def get_data():
    global json_data
    url = "https://www.waze.com/row-partnerhub-api/partners/11315398994/waze-feeds/d15f3f75-64f0-4455-8bdd-a9b1fc1d1d44?format=1"

    try:
        response = requests.get(url)
        response.raise_for_status()
        json_data = response.json()
        return json_data
    except requests.exceptions.RequestException as e:
        print(f"Error fetching data; {e} ")
        return None


"""
creates a request if 30 minutes elapsed
"""


def create_requests_for_traffic():
    global json_data

    if os.path.exists(filepath):
        print("Request went out for traffic data.")
        data = get_data()
        data_to_file()
    else:
        print("Loaded from file traffic data.")
        data_from_file()


"""
Data output to a file.
"""


def data_to_file():
    with open(filepath, "w") as file:
        json.dump(json_data, file)


"""
Data input from a file.
"""


def data_from_file():
    global json_data
    with open(filepath, "r") as file:
        json_data = json.load(file)


"""
Extracting all the jams most important information:
https://support.google.com/waze/partners/answer/13458165?sjid=4405545816997519851-EU#zippy=%2Cretrieving-waze-traffic-data%2Ctraffic-jams%2Cdata-elements%2Cjson
    -geometry
    -level of jam
    -length
    -roadtype
INPUT: - jams dictionary
OUTPUT: - list of important data
"""


def extracting_jams(jams):
    table_data = []
    row = []
    for values in jams:
        row.append(values["line"])
        row.append(values["level"])
        row.append(values["length"])
        row.append(values["roadType"])
        table_data.append(row)
        row = []

    return table_data


"""
Extracting all the alerts most important information
https://support.google.com/waze/partners/answer/13458165?sjid=4405545816997519851-EU#zippy=%2Cretrieving-waze-traffic-data%2Ctraffic-jams%2Cdata-elements%2Cjson%2Ctraffic-alerts
    -coordinates
    -type
    -reliability 0-10
    -confidence 0-10
INPUT: - alerts dictionary
OUTPUT: - list of important alert data
"""


def extracting_alerts(alerts):
    table_data = []
    row = []
    for values in alerts:
        row.append(values["location"])
        row.append(values["type"])
        row.append(values["confidence"])
        row.append(values["reliability"])
        table_data.append(row)
        row = []
    return table_data


"""
Transforming the json data into a table
Output: -table_data_jams,
        -table_data_alerts
"""


def transform_data():
    jams = json_data["jams"]
    alerts = json_data["alerts"]

    table_data_jams = extracting_jams(jams)
    table_data_alerts = extracting_alerts(alerts)
    return table_data_jams, table_data_alerts


"""
Writes out a table type data into csv
INPUT: - filename
       - data
"""


def write_data_to_file_csv(filename, data, header):
    with open(filename, "w", newline="") as file:
        writer = csv.writer(file)
        writer.writerow(header)
        writer.writerows(data)


"""
Check if the new line is already in one of the existing geometries
"""


def is_line_in_existing(new_line, existing_lines):
    for line in existing_lines:
        if new_line.equals(line["geometry"]) or new_line.intersects(line["geometry"]):
            return True
    return False


"""
Writes out a table type data into shp
INPUT: - filename
       - data
"""


def write_data_to_jams_shp(filename, data):
    lines = []
    color_map = {
        0: 'white',
        1: 'green',
        2: 'blue',
        3: 'yellow',
        4: 'purple',
        5: 'red',
    }
    for line in data:
        coords = line[0]
        level = line[1]
        length = line[2]
        roadtype = line[3]

        line_coords = [(point['x'], point['y']) for point in coords]
        line_String = LineString(line_coords)

        color = color_map[level]

        if not is_line_in_existing(line_String, lines):
            lines.append({
                'geometry': line_String,
                'color': color,
                'level': level,
                'length': length,
                'roadtype': roadtype,
            })

    gdf_lines = gpd.GeoDataFrame(lines, crs="EPSG:4326")
    gdf_lines.to_file(filename)


"""
Writes out a table type data into shp
INPUT: - filename
       - data
"""


def write_data_to_alerts_shp(filename, data):
    alerts = []
    for points in data:
        alert_point = points[0]
        alert_type = points[1]
        reli = points[2]
        confi = points[3]

        alert_point = Point(alert_point['x'], alert_point['y'])
        alerts.append({
            'geometry': alert_point,
            'alert_type': alert_type,
            'reliabilit': reli,
            'confidence': confi,
        })

    gdf_points = gpd.GeoDataFrame(alerts, crs="EPSG:4326")
    gdf_points.to_file(filename)


"""
Saves the fresh data
"""


def save_jams_and_alerts(table_data_alerts, table_data_jams):
    timestamp = time.strftime("%Y-%m-%d_%H-%M-%S")
    header = ["geometry", "level", "length", "roadtype"]
    write_data_to_file_csv(f"../resources/table_data/jams_{timestamp}.csv", table_data_jams, header)

    header = ["geometry", "type", "reliabilit", "confidence"]
    write_data_to_file_csv(f"../resources/table_data/alerts_{timestamp}.csv", table_data_alerts, header)

    write_data_to_jams_shp(f"../resources/shapefiles/jams_{timestamp}.shp", table_data_jams)
    write_data_to_alerts_shp(f"../resources/shapefiles/alerts_{timestamp}.shp", table_data_alerts)


"""
Refreshes data.
"""


def refresh_traffic():
    global filepath
    filepath = "../resources/traffic_data.json"
    create_requests_for_traffic()
    table_data_jams, table_data_alerts = transform_data()
    save_jams_and_alerts(table_data_alerts, table_data_jams)


def main():
    create_requests_for_traffic()
    table_data_jams, table_data_alerts = transform_data()
    save_jams_and_alerts(table_data_alerts, table_data_jams)


if __name__ == "__main__":
    filepath = "../resources/traffic_data.json"
    main()
