import osmnx as ox
from shapely.geometry import Point, LineString
from shapely.strtree import STRtree
from math import sqrt, radians, cos, sin, atan2
from sklearn.preprocessing import MinMaxScaler
from os.path import exists
from random import uniform
from traffic_module import refresh_traffic
from resource_generator import refresh_resource_generator
import heapq
import polyline
import pandas as pd
import geopandas as gpd
from shapely.wkt import loads
import csv
import threading as th

full_graph = None
nodes_full = None
edges_full = None
epsg_c = None
df_weights_projected = None
gdf_reset = None
_dict_yx_id = None
_dict_id_yx = None
_dict_neighbours = None
_lock = th.Lock()

"""
Calls for other modules to refresh the dynamic data
"""


def call_others_module_refresh():
    # aqi_module.refresh()
    refresh_traffic()
    refresh_resource_generator()


"""
Refreshing dynamic data like traffic and aqi.
"""


def refresh_data():
    global epsg_c, full_graph, nodes_full, edges_full, df_weights_projected, gdf_reset, _dict_yx_id, _dict_id_yx, _dict_neighbours
    print("Data cleared")
    full_graph = None
    nodes_full = None
    edges_full = None
    epsg_c = None
    df_weights_projected = None
    gdf_reset = None
    _dict_yx_id = None
    _dict_id_yx = None
    _dict_neighbours = None

    call_others_module_refresh()


"""
Returns data if its not initialized it will initialize.
Returns: - epsg_c
         - full_graph
         - nodes_full
         - edges_full
         - df_weights_projected
         - gdf_reset

"""


def get_resources():
    global epsg_c, full_graph, nodes_full, edges_full, df_weights_projected, gdf_reset, _dict_yx_id, _dict_id_yx, _dict_neighbours
    if full_graph is None and nodes_full is None and edges_full is None and epsg_c is None and df_weights_projected is None and gdf_reset is None and _dict_id_yx is None and _dict_yx_id is None and _dict_neighbours is None:
        with _lock:
            if full_graph is None and nodes_full is None and edges_full is None and epsg_c is None and df_weights_projected is None and gdf_reset is None and _dict_id_yx is None and _dict_yx_id is None and _dict_neighbours is None:
                epsg_c, full_graph, nodes_full, edges_full, df_weights_projected, gdf_reset, _dict_yx_id, _dict_id_yx, _dict_neighbours = initialization()
                return epsg_c, full_graph, nodes_full, edges_full, df_weights_projected, gdf_reset, _dict_yx_id, _dict_id_yx, _dict_neighbours
    return epsg_c, full_graph, nodes_full, edges_full, df_weights_projected, gdf_reset, _dict_yx_id, _dict_id_yx, _dict_neighbours


"""
Initializing all the data
"""


def initialization():
    print("Initialized")
    epsg_c = 4326
    full_graph = ox.load_graphml(filepath="../resources/graph/full_graph.graphml")
    nodes_full, edges_full = ox.graph_to_gdfs(full_graph)
    df_weights_projected = initialize_df_weights(edges_full, epsg_c)

    df_weights_projected_no_parallels, full_graph_no_parallels = clear_parallels(df_weights_projected, full_graph,
                                                                                 nodes_full)
    gdf_reset = gdf_reset_for_a_start(df_weights_projected_no_parallels)

    dict_yx_id = create_dictionary_yx_id(nodes_full)
    dict_id_yx = create_dictionary_id_yx(nodes_full)
    dict_neighbours = create_id_neighbours(full_graph)

    gdf_reset_normalized = normalize(gdf_reset)
    return epsg_c, full_graph_no_parallels, nodes_full, edges_full, df_weights_projected, gdf_reset_normalized, dict_yx_id, dict_id_yx, dict_neighbours


"""
Setting tags, w - global value
"""


def set_tags(tags, gdf_reset):
    if tags is None:
        w = [1, 0, 0, 0, 0, 0, 0]
    else:
        if len(tags) != 0:
            column_count = gdf_reset.shape[1]
            tags_dict = {
                'Length': 0,
                'Nature': 3,
                'Shadow': 4,
                'Water': 5,
                'No Pollution': 6,
            }
            w = [0 for i in range(column_count)]
            w[0] = 0.65
            w[2] = 0.1
            base_value = 1 - w[0] - w[2]
            value_tags = round(base_value / len(tags), 4)
            sum_value = 0
            for i in range(len(tags) - 1):
                w[tags_dict[tags[i]]] = value_tags
                sum_value = sum_value + value_tags

            w[tags_dict[tags[len(tags) - 1]]] = base_value - sum_value
        else:
            column_count = gdf_reset.shape[1]
            w = [0 for i in range(column_count)]
            w[0] = 0.85
            w[2] = 0.15
    return w


"""
Saving dataframe weight for future use
"""


def save_df_weights():
    filename = "../resources/weights_data.csv"
    df_weights_projected.to_csv(filename)


"""
Initializing weight dataframe
"""


def initialize_df_weights(edges_full, epsg_c):
    if not saved_data("weights_data"):

        df_weights = pd.DataFrame()
        df_weights = edges_full[["length", "geometry"]]
        df_weights_projected = gpd.GeoDataFrame(df_weights, geometry="geometry")
    else:
        df_weights = pd.read_csv("../resources/weights_data.csv")
        df_weights["geometry"] = df_weights["geometry"].apply(loads)
        df_weights_projected = gpd.GeoDataFrame(df_weights, geometry="geometry")
        df_weights_projected.set_crs(epsg=epsg_c, inplace=True)
        df_weights_projected.set_index(["u", "v", "key"], inplace=True)

    return df_weights_projected


"""
Distance between coordinates
Input: - lat1 latitude 1
       - lon1 longitude 1
       - lat2 latitude 2
       - lon2 longitude 2
Output: distance between two points in meters
"""


def haversine(lat1, lon1, lat2, lon2):
    # Convert latitude and longitude from degrees to radians
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])

    # Haversine formula
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    r = 6371  # Radius of Earth in kilometers. Use 3956 for miles.
    return r * c


"""
Finding the nearest edge in the dataframe
"""


def nearest_edge_rep(point, gdf_reset):
    geometries = gdf_reset.geometry.tolist()

    point_to_find = Point(point[1], point[0])
    str_tree = STRtree(geometries)

    nearest_geom_id = str_tree.nearest(point_to_find)
    nearest_geom = geometries[nearest_geom_id]
    p1 = nearest_geom.coords[0]
    p1_rounded = tuple(round(x, 7) for x in p1)
    p2 = nearest_geom.coords[-1]
    p2_rounded = tuple(round(x, 7) for x in p2)

    distance_to_line = nearest_geom.project(point_to_find)
    final_point = nearest_geom.interpolate(distance_to_line)

    '''
    x, y = nearest_geom.xy  # Extract x and y coordinates
    plt.scatter(final_point.x,final_point.y, color="green", label="Point")
    plt.plot(x, y,color="blue" ,label="LineString")
    plt.scatter(point[1],point[0], color="red", label="Point")
    plt.legend()
    plt.show()
    '''

    return p1_rounded, p2_rounded, final_point


"""
Function:
input: - Point: (x,y) data
output: - p1,p2 - nodes
        - final_point - point on the Linestring
"""


def getting_nearest_edge(point, edges_full, nodes_full, full_graph):
    dict_edges = create_id_geometry(edges_full)

    projected_point = Point(point[1], point[0])

    # getting the nearest edge
    nearest_edge = ox.nearest_edges(full_graph, X=point[1], Y=point[0])

    # getting the starting and ending coordinates of the edge
    p1 = nodes_full.loc[nearest_edge[0]]
    p2 = nodes_full.loc[nearest_edge[1]]
    geometry = dict_edges[(nearest_edge[0], nearest_edge[1])]

    line_start = geometry

    distance_to_line = line_start.project(projected_point)
    final_point = line_start.interpolate(distance_to_line)

    return p1, p2, final_point


"""
Getting the nearest coordinates of the start point and the end point
Input: - start,destination: two points
       - gdf_reset : dataframe will all the stats
Output: -point_start1,point_start2,point_dest1,point_dest2 - start end end nodes
        - projected_point_start,projected_point_dest - projected poitns on the edge between the points
"""


def find_starting_coordinate(start, destination, gdf_reset):
    point_start1, point_start2, projected_point_start = nearest_edge_rep(start, gdf_reset)
    point_dest1, point_dest2, projected_point_dest = nearest_edge_rep(destination, gdf_reset)

    return point_start1, point_start2, point_dest1, point_dest2, projected_point_start, projected_point_dest


"""
Transforming the nodes into a !(y,x)!, id dictionaries
dictionary: Nodes
key: y,x
values: index
"""


def create_dictionary_yx_id(nodes):
    dictionary_nodes_walk_yx = dict()
    for index, row in nodes.iterrows():
        dictionary_nodes_walk_yx[(row.iloc[0], row.iloc[1])] = index

    return dictionary_nodes_walk_yx


"""
Transforming the nodes into a !(x,y)!, id dictionaries
dictionary: Nodes
key: x,y
values: index
"""


def create_dictionary_xy_id(nodes):
    dictionary_nodes_walk_xy = dict()
    for index, row in nodes.iterrows():
        dictionary_nodes_walk_xy[(row.iloc[1], row.iloc[0])] = index

    return dictionary_nodes_walk_xy


"""
dictionary: Nodes
key: index
values: y,x
"""


def create_dictionary_id_yx(nodes):
    dictionary_nodes_walk_index = dict()
    for index, row in nodes.iterrows():
        dictionary_nodes_walk_index[index] = (row.iloc[0], row.iloc[1])
    return dictionary_nodes_walk_index


"""
dictionary: Nodes
key: id
values: neighbors
"""


def create_id_neighbours(G):
    adjacency_nodes_walk = dict()
    for key, value in G.adjacency():
        list_of_neighbors = []
        for i in value:
            list_of_neighbors.append(i)

        adjacency_nodes_walk[key] = list_of_neighbors
    return adjacency_nodes_walk


"""
dictionary: EDGES
key: id
values:  geometry
"""


def create_id_geometry(edges_full):
    dictionary_edges = dict()
    for key, value in edges_full.iterrows():
        dictionary_edges[(key[0], key[1])] = value["geometry"]
    return dictionary_edges


"""
dictionary: EDGES
key: id
values:  length
"""


def create_id_length():
    dictionary_edges = dict()
    for key, value in edges_full.iterrows():
        dictionary_edges[(key[0], key[1])] = value["length"]
    return dictionary_edges


"""
dictionary: Tree covers
key: id
values: geometry
"""


def create_id_geometry_tree(tree_data):
    dictionary = dict()
    for key, value in tree_data.iterrows():
        dictionary[key] = value.geometry
    return dictionary


"""
selects the closest points from the start nodes to the end
Input: - point_start1, point_start2 - the closest edges first point
       - point_dest1, point_dest2 - the closest edges first point
Output:
    - Start and Destination: (start),(destination)
"""


def selection_of_closest_starting_point(point_start1, point_start2, point_dest1, point_dest2):
    s1y = point_start1[1]
    s1x = point_start1[0]
    s2y = point_start2[1]
    s2x = point_start2[0]

    e1y = point_dest1[1]
    e1x = point_dest1[0]
    e2y = point_dest2[1]
    e2x = point_dest2[0]

    s1e1 = haversine(s1y, s1x, e1y, e1x)
    s1e2 = haversine(s1y, s1x, e2y, e2x)
    s2e1 = haversine(s2y, s2x, e1y, e1x)
    s2e2 = haversine(s2y, s2x, e2y, e2x)

    l = min(s1e1, s2e1, s1e2, s2e2)
    if l == s1e1:
        return (s1y, s1x), (e1y, e1x)

    if l == s1e2:
        return (s1y, s1x), (e2y, e2x)

    if l == s2e1:
        return (s2y, s2x), (e1y, e1x)

    if l == s2e2:
        return (s2y, s2x), (e2y, e2x)


"""
Is it saved or not
Input: filename
Output: True, False
"""


def saved_data(name):
    file_path = f"../resources/{name}.csv"
    if exists(file_path):
        return True
    return False


"""
This a function to do min_max normalization HIGHER is better
Input: array - ints
Output: array with normalized values
"""


def min_max_normalize(array):
    mi = min(array)
    ma = max(array)
    return [(x - mi) / (ma - mi) for x in array]


"""
This a function to do max_min normalization LOWER is better
Input: array - ints
Output: array with normalized values
"""


def max_min_normalize(array):
    mi = min(array)
    ma = max(array)
    return [(ma - x) / (ma - mi) for x in array]


"""
Input: u,v indexes of the points
Output: a value of the edge according to the weights
"""


def heuristic(u, v, gdf_reset, tags):
    w = set_tags(tags, gdf_reset)
    row = get_value_from_list(u, v, gdf_reset)
    # print(sor.values[0][1]) length
    # weights from settings + calculations
    values = []
    values.append(row["length"])
    values.append(row["traffic"])
    values.append(row["tree_vs_urban_score"])
    values.append(row["tree_cover_score"])
    values.append(row["water_score"])
    values.append(row["AQI_score"])

    score = sum([values[i] * w[i] for i in range(len(values))]).item()

    return score


"""
Gives back value of a key in a dataframe
"""


def get_value_from_df(df, key):
    try:
        return df.loc[key]
    except KeyError:
        reversed_key = (key[1], key[0])
        try:
            return df.loc[reversed_key]
        except KeyError:
            raise KeyError(f"Key {key} and its reverse {reversed_key} not found in the dictionary")


"""
Gives back value of a key in a dictionary
"""


def get_value_from_dict(d, key):
    try:
        return d[key]
    except KeyError:
        reversed_key = (key[1], key[0])
        try:
            return d[reversed_key]
        except KeyError:
            raise KeyError(f"Key {key} and its reverse {reversed_key} not found in the dictionary")


"""
Returns an organized sorted indexed
"""


def gdf_reset_for_a_start(df_weights_projected):
    gdf_reset = df_weights_projected.reset_index()
    gdf_reset.set_index(['u', 'v'], inplace=True)
    gdf_reset = gdf_reset.sort_index()

    return gdf_reset


"""
A_start algorithm
Input: Full_graph - contains all the nodes and edges 
       start_point - coordinates on the map or here the user is 
       end_point   - coordinates on the map or where user wants to go
Output: path - with the optimal road
"""


def a_star(start_point, end_point, type_of_return, tags):
    _, full_graph, _, _, _, gdf_reset, dict_yx_id, dict_id_yx, dict_neighbours = get_resources()
    graph = full_graph

    point_start1, point_start2, point_dest1, point_dest2, projected_s, projected_d = find_starting_coordinate(
        start_point, end_point, gdf_reset)
    start, goal = selection_of_closest_starting_point(point_start1, point_start2, point_dest1, point_dest2)

    open_set = []
    heapq.heappush(open_set, (0, dict_yx_id[start]))
    # came_from IDs
    came_from = {}
    g_score = {node: float('inf') for node in graph}
    g_score[dict_yx_id[start]] = 0
    f_score = {node: float('inf') for node in graph}
    f_score[dict_yx_id[start]] = haversine(start[0], start[1], goal[0], goal[1])

    while open_set:
        # current - id node
        current = heapq.heappop(open_set)[1]

        if dict_id_yx[current] == goal:
            path = []
            length = 0
            # The end point given
            path.append((end_point[1], end_point[0]))
            # The point interpolation to and edge
            path.append((projected_d.x, projected_d.y))
            """
            (y,x) = goal
            #Closeset nodes end
            path.append((x,y))
             """
            length = length + haversine(projected_d.y, projected_d.x, goal[0], goal[1])

            # add geometry
            while current in came_from:
                (y, x) = dict_id_yx[current]
                path.append((x, y))
                # length = length + get_value_from_dict(dict_edges_length,(current,came_from[current]))
                length = length + heuristic(current, came_from[current], gdf_reset, tags)
                current = came_from[current]

            length = length + haversine(start[0], start[1], projected_s.y, projected_s.x)

            # Closest nodes start
            (y, x) = start
            path.append((x, y))
            # The point interpolation to and edge
            path.append((projected_s.x, projected_s.y))
            # The start point given
            path.append((start_point[1], start_point[0]))

            if type_of_return:
                path_to_send = path[::-1]
                json = transforming_into_json(path_to_send, 0)
                # res_end_star = time.time()
                # print(f"A star stuff {res_end_star-res_start_star}")
                return json
            return path[::-1], length

        for neighbor in dict_neighbours[current]:
            lat1, lon1 = dict_id_yx[current]
            lat2, lon2 = dict_id_yx[neighbor]
            # tentative_g_score = g_score[current] + get_value_from_dict(dict_edges_length,(current,neighbor))
            tentative_g_score = g_score[current] + heuristic(current, neighbor, gdf_reset, tags)
            if tentative_g_score < g_score[neighbor]:
                lat3, lon3 = goal
                came_from[neighbor] = current
                g_score[neighbor] = tentative_g_score
                f_score[neighbor] = g_score[neighbor] + haversine(lat2, lon2, lat3, lon3)
                if neighbor not in [i[1] for i in open_set]:
                    heapq.heappush(open_set, (f_score[neighbor], neighbor))

    return None


"""
Transform into a format so the mapbox can read
input: - path
       - encoding 1 yes, 0 no
output: - json encoded path
"""


def transforming_into_json(path, encoding):
    if encoding:
        path = polyline.encode(path)

    return {
        "routes": [
            {
                "overview_polyline": {
                    "points": path
                }
            }
        ]
    }


"""
Generate 100 pairs of 
"""


def generate_n_end_and_start_points(number_of_points):
    coordinates_start = []
    coordinates_end = []
    bounding_box = {
        "min_lat": 46.7300,  # Southernmost latitude
        "max_lat": 46.8000,  # Northernmost latitude
        "min_lon": 23.5000,  # Westernmost longitude
        "max_lon": 23.7100,  # Easternmost longitude
    }
    for _ in range(number_of_points):
        lat = uniform(bounding_box["min_lat"], bounding_box["max_lat"])
        lon = uniform(bounding_box["min_lon"], bounding_box["max_lon"])
        coordinates_start.append((lat, lon))

        lat = uniform(bounding_box["min_lat"], bounding_box["max_lat"])
        lon = uniform(bounding_box["min_lon"], bounding_box["max_lon"])
        coordinates_end.append((lat, lon))

    data = {
        "Start Longitude": [coord[1] for coord in coordinates_start],
        "Start Latitude": [coord[0] for coord in coordinates_start],
        "End Longitude": [coord[1] for coord in coordinates_end],
        "End Latitude": [coord[0] for coord in coordinates_end],
    }

    filename = "../resources/random_coordinates"
    df = pd.DataFrame(data)
    df.to_csv(filename)

    return coordinates_start, coordinates_end


"""
Generates number_of_points amount of paths.

"""


def generating_paths(number_of_points):
    # starts, ends = generate_n_end_and_start_points(number_of_points)
    starts = [(46.7470028, 23.5894917)]
    ends = [(46.74922368, 23.57449194)]
    paths = []
    tags = ['shadow', 'green']
    lines = []
    path_encoded_json = []
    path_json = []
    rounded_coords_starts = [(round(lat, 6), round(lon, 6)) for lat, lon in starts]
    rounded_coords_ends = [(round(lat, 6), round(lon, 6)) for lat, lon in ends]

    for i in range(number_of_points):
        path, length = a_star(rounded_coords_starts[i], rounded_coords_ends[i], 0, tags)
        print(path)
        line = LineString(path)
        paths.append(path)
        lines.append(line)

        path_encoded_json.append(transforming_into_json(path, True))
        path_json.append(transforming_into_json(path, False))

    rows = zip(rounded_coords_starts, rounded_coords_ends, path_encoded_json, path_json)
    filename = "../resources/paths_table.csv"
    with open(filename, "w", newline="") as file:
        writer = csv.writer(file)
        writer.writerow(["Column1", "Column2", "Column3", "Column4"])
        writer.writerows(rows)
    # print(lines)

    gdf_lines = gpd.GeoDataFrame(geometry=lines, crs=epsg_c)
    shapefile = "../resources/line_strings.shp"
    gdf_lines.to_file(shapefile)


"""
Normalization of data
We want smaller scores, so we must make the scores have the best values at near 0 and the worse at max value
Input: -df dataframe with scores
Output: - df with normalized scores
"""


def normalize(df):
    all_the_columns = ['tree_vs_urban_score', 'tree_cover_score', 'water_score', 'traffic', 'AQI_score']
    scalar = MinMaxScaler(feature_range=(0, 100))
    df[all_the_columns] = scalar.fit_transform(df[all_the_columns])

    inversed_values = ['tree_vs_urban_score', 'tree_cover_score', 'water_score']

    df[inversed_values] = 100 - df[inversed_values]
    return df


"""
Returns start
Input: edge
"""


def get_starting_value(edge):
    return edge.coords[0]


"""
Returns ending
Input: edge
"""


def get_ending_value(edge):
    return edge.coords[-1]


"""
Returns a value from the indexed and sorted database
Input: - u, v indexes
Output: - a row from the database
"""


def get_value_from_list(u, v, gdf_reset):
    try:
        # Try to access list[u][v]
        value = gdf_reset.loc[(u, v)]
    except IndexError:
        try:
            # If list[u][v] doesn't exist, try list[v][u]
            value = gdf_reset.loc[(v, u)]
        except IndexError:

            value = None
        except KeyError:

            value = None
    except KeyError:
        try:
            # If list[u][v] doesn't exist, try list[v][u]
            value = gdf_reset.loc[(v, u)]
        except KeyError:

            value = None
        except IndexError:

            value = None
    return value


"""
Scoring getting scores from edges
Input: - nodes : List
Output: - value : int
"""


def scoring_path(nodes, gdf_reset):
    score = 0
    tags = ["length"]
    for i in range(0, len(nodes) - 1, 2):
        score = score + heuristic(nodes[i], nodes[i + 1], gdf_reset, tags)
    return score


"""
Clear parallel which are weaker in score, if you need them back it can be worked around later.
"""


def clear_parallels(df_weights_projected, full_graph, nodes_full):
    gdf_sorted = df_weights_projected.sort_values(by=['u', 'v', 'key', 'length'], ascending=[True, True, True, False])
    df_weights_projected = gdf_sorted.loc[gdf_sorted.groupby(['u', 'v'])['length'].idxmax()]

    edges_gdfs = df_weights_projected
    full_graph = ox.graph_from_gdfs(nodes_full, edges_gdfs)
    return df_weights_projected, full_graph


def main():
    generating_paths(1)
    """
    start = { "latitude": 46.7470028, "longitude": 23.5894917 }
    finish = { "latitude": 46.74922368, "longitude": 23.57449194 }
    tags = []
    path = a_star((start["latitude"],start["longitude"]),(finish["latitude"],finish["longitude"]),1,tags)
    print(path)
    """
    # Normalization
    """
    start = { "latitude": 46.772148, "longitude": 23.578367 }
    finish = { "latitude": 46.761774, "longitude": 23.625829 }
    path = a_star((start["latitude"],start["longitude"]),(finish["latitude"],finish["longitude"]),1)
    print(path)
    normalize(gdf_reset)
    """
    # Evaluation
    # own_evaluation = evaluate_the_route_own()
    # own_evaluation = evaluate_the_route_from_outside()
    # Prediction
    # print(df_weights_projected)


if __name__ == "__main__":
    main()
