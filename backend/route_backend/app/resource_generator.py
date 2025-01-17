import osmnx as ox
from shapely.geometry import Point, LineString
from os.path import exists
from shapely.strtree import STRtree
import ast
import os
import pandas as pd
import geopandas as gpd
from shapely.wkt import loads

full_graph = None
nodes_full = None
edges_full = None
epsg_c = None
epsg_m = None

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
Saving dataframe weight for future use
"""
def save_df_weights():
    filename = "../resources/weights_data.csv"
    df_weights_projected.to_csv(filename)


"""
Launches all the resources interpreters
"""
def data_setup(settings):
    if settings["tree_vs_urban_score"]:
        urban_vs_green_cover()
    if settings["tree_cover_score"]:
        tree_cover()
    if settings["water_score"]:
        water_sources_evaluation()
    if settings["aqi"]:
        calculate_aqi_score()
    if settings["traffic"]:
        calculate_traffic_values()
    if settings["save"]:
        save_df_weights()
    return

"""
Clear parallel which are weaker in score, if you need them back it can be worked around later.
"""
def clear_parallels():
    global df_weights_projected, full_graph
    gdf_sorted = df_weights_projected.sort_values(by=['u','v','key','length'],ascending=[True,True,True,False])
    df_weights_projected = gdf_sorted.loc[gdf_sorted.groupby(['u','v'])['length'].idxmax()]

    edges_gdfs = df_weights_projected
    full_graph = ox.graph_from_gdfs(nodes_full,edges_gdfs)


def initialization(settings):

    global epsg_c, epsg_m, nodes_full, edges_full, full_graph

        
    epsg_c = 4326
    epsg_m = 32634
    full_graph = ox.load_graphml(filepath="../resources/graph/full_graph.graphml")
    nodes_full, edges_full = ox.graph_to_gdfs(full_graph)
    initialize_df_weights()
    data_setup(settings)

    clear_parallels()


"""
Initializing weight dataframe
"""
def initialize_df_weights():
    global  df_weights_projected

    if not saved_data("weights_data"):
            
        df_weights = pd.DataFrame()
        df_weights = edges_full[["length","geometry"]]
        df_weights_projected = gpd.GeoDataFrame(df_weights,geometry="geometry")
    else: 
        df_weights = pd.read_csv("../resources/weights_data.csv")
        df_weights["geometry"] = df_weights["geometry"].apply(loads)
        df_weights_projected = gpd.GeoDataFrame(df_weights,geometry="geometry")
        df_weights_projected.set_crs(epsg=epsg_c,inplace=True)
        df_weights_projected.set_index(["u","v","key"],inplace=True)



"""
Extracting aqi indexes both rou and universal
"""
def extract_indexes(indexes):
   
    aqi_uni = []
    aqi_rou = []
    for elements in indexes:
        aqi_uni.append(elements[0]["aqi"])
        aqi_rou.append(elements[1]["aqi"])

    return aqi_uni,aqi_rou

"""
Extracting all the pollutants from the dataset
It can later be used to analyze the specific values
"""
def extract_pollutants(pollutants):

    aqi_pollutants = []
    for pollutant_list in pollutants:
        values = []
        for pollutant in  pollutant_list:
            values.append(pollutant["concentration"]["value"])
        aqi_pollutants.append(values)

    return aqi_pollutants

"""
Extracting health recommendations
"""
def extract_health(health_recommendations):

    set_health = []
    for healths in health_recommendations:
        list_of_details = [healths["generalPopulation"], healths["elderly"], healths["lungDiseasePopulation"],
                           healths["heartDiseasePopulation"], healths["athletes"], healths["pregnantWomen"],
                           healths["children"]]
        set_health.append(list_of_details)
    return set_health


"""
Creating the aqi dataset
"""    
def extract_aqi_data_from_tables():

    df_aqi = pd.read_json("../resources/aqi_data")
    df_coords_aqi = pd.read_csv("../resources/coordinates_for_aqi.csv")
    
    aqi_levels_rou = dict()
    aqi_levels_rou[1] = "bun"
    aqi_levels_rou[2] = "acceptabil"
    aqi_levels_rou[3] = "moderat"
    aqi_levels_rou[4] = "rau"
    aqi_levels_rou[5] = "foarte rau"
    aqi_levels_rou[6] = "extrem de rau"

    aqi_uni,aqi_rou = extract_indexes(df_aqi["indexes"])
    aqi_pollutants = extract_pollutants(df_aqi["pollutants"])
    list_health = extract_health(df_aqi["healthRecommendations"])


    data_base = pd.DataFrame(
        {
            "x": df_coords_aqi["1"],
            "y": df_coords_aqi["0"],
            "aqi_uni": aqi_uni,
            "aqi_rou": aqi_rou,
            "aqi_pollutants": aqi_pollutants
        }
    )
    return data_base,list_health


"""
AQI_SCORE = average of the aqi points close to the edge in a 500 m parameter 
"""
def calculate_influence(edge,extract_aqi_data,aqi_index):

    influence_radius = 500
    buffer_aqi_points = edge.buffer(influence_radius)
    possible_close_aqi_points = aqi_index.query(buffer_aqi_points)
    
    aqi_score = 0
    for aqi_point in possible_close_aqi_points:
        aqi_score = aqi_score + extract_aqi_data.loc[aqi_point]["aqi_uni"]

    if len(possible_close_aqi_points) ==0:
        return 0
    
    return aqi_score/len(possible_close_aqi_points)

"""
AQI data imported and turned into score
"""
def calculate_aqi_score():

    df_extract_aqi_data,list_health = extract_aqi_data_from_tables()
    df_extract_aqi_data['geometry'] = df_extract_aqi_data.apply(lambda row: Point(row['x'], row['y']), axis=1)
    gdf_extract_aqi_data = gpd.GeoDataFrame(df_extract_aqi_data, geometry='geometry')
    gdf_extract_aqi_data.set_crs(epsg=epsg_c,inplace=True)
    gdf_extract_aqi_data.reset_index(drop=True, inplace=True)
    gdf_extract_aqi_data['id'] = gdf_extract_aqi_data.index 
    gdf_extract_aqi_data.set_index('id', inplace=True)

    #set crs
    gdf_extract_aqi_data.to_crs(epsg=epsg_m, inplace=True)
    df_weights_projected.to_crs(epsg=epsg_m, inplace=True)

    #create a geo indexed tree
    aqi_index = STRtree(gdf_extract_aqi_data.geometry.values)

    df_weights_projected["AQI_score"] = df_weights_projected.geometry.apply(
        lambda edge: calculate_influence(edge,gdf_extract_aqi_data,aqi_index)
    )
    
    df_weights_projected.to_crs(epsg=epsg_c, inplace=True)



"""
Score calculation function:
This works with a indexed data, which can be used as area affect
So we define a couple of thresholds, which interests us and evaluate them.
input: edge - which is buffered
       thresholds - gives the area effect of something
       well_index - is a geometrically indexed tree, which helps with computation
output: points - gives how many points does this score, closer the item to edge the higher point it gets.
"""
def calculate_score_with_index(edge, thresholds, well_index):
    # Buffer the edge and query nearby wells

    wells_got = []
    wells_visited = set()
    for threshold in thresholds:

        
        level = []
        edge_buffer = edge.buffer(threshold)
        nearby_wells = well_index.query(edge_buffer)
        for i in nearby_wells:

            if i not in wells_visited:
                level.append(i)
                wells_visited.add(i)
        wells_got.append(level)

    points = 0   
    points = len(wells_got[0]) * 5 + len(wells_got[1]) * 3 + len(wells_got[2]) * 1
    return points

"""
Water sources data extrapolation to the edges.
SCORE: 3 distance fo the point is closer than 25m
       2 distance for the point is closer than 150m
       1 distance for the point is closer than 300m
       0 else
"""
def water_sources_evaluation():
    
    # Build a spatial index for well
    water_data = pd.read_csv("../resources/final_water_data.csv")
    
    water_data['geometry'] = water_data.apply(lambda row: Point(row['xcoord'], row['ycoord']), axis=1)
    water_data_df = gpd.GeoDataFrame(water_data,geometry="geometry")
    water_data_df.set_crs(epsg=4326, inplace=True)
    water_data_df.to_crs(epsg=32634 ,inplace=True)
    df_weights_projected.to_crs(epsg=32634,inplace=True)

    # Build a spatial index for wells
    well_index = STRtree(water_data_df.geometry.values)
    
    #print(well_index)
    threshold = [25,150,300]
    df_weights_projected['water_score'] = df_weights_projected.geometry.apply(
        lambda edge: calculate_score_with_index(edge, threshold, well_index))
   
   # df_weights_projected['water_score'] = min_max_normalize(df_weights_projected['water_score'])
    df_weights_projected.to_crs(epsg=4326,inplace=True)

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
Calculates the percentage an edge is covered by the trees
input: - edges : the graph
       - green_zone_index : indexed tree representation of the tree covers for faster run time
       - dictionary_id_geometry_trees : to convert id into geometry
"""
def calculate_intersection(edge,green_zone_index,dictionary_id_geometry_trees):
   
    candidate_covers = green_zone_index.query(edge)
    intersecting_length = 0
    for geom_id in candidate_covers:
        if edge.intersects(dictionary_id_geometry_trees[geom_id]) :
            intersecting_length = intersecting_length + edge.intersection(dictionary_id_geometry_trees[geom_id]).length

    total_length = edge.length       
    intersection_percentage = (intersecting_length / total_length) * 100

    return intersection_percentage
   
"""
Tree cover calculations on the edge
"""
def tree_cover():
    input_file = "../resources/Trees_only_data.gpkg"
    data = gpd.read_file(input_file)
    if df_weights_projected.crs != 4326:
        df_weights_projected.to_crs(epsg=4326,inplace=True)

    #Build a spatial index for the trees
    green_zones_indexed = STRtree(data.geometry.values)

    dictionary_id_geometry_trees = create_id_geometry_tree(data)
    df_weights_projected["tree_cover_score"] = df_weights_projected.geometry.apply(
        lambda edge: calculate_intersection(edge,green_zones_indexed,dictionary_id_geometry_trees)
    )
    
"""
Area ration. 
Input: - Edges
       - threshold : a value in m which represents the zone around the edge
       - urban_zones_indexed: STRtree of urban zones
       - green_zones_indexed: STRtree of green zones
Output:
Classification:
    = green_ratio - urban_ration
"""
def calculate_area_ratio(edge,threshold,green_zones_indexed,urban_zones_indexed,dictionary_id_geometry_trees,dictionary_id_geometry_urban) :
    edge_buffer = edge.buffer(threshold)

    green_indexes = green_zones_indexed.query(edge_buffer)
    urban_indexes = urban_zones_indexed.query(edge_buffer)
  
    edge_buffer_area = edge_buffer.area

    green_area = 0
    for geom_id in green_indexes:
        green_area = green_area + edge_buffer.intersection(dictionary_id_geometry_trees[geom_id]).area
    
    urban_area = 0
    for geom_id in urban_indexes:
        urban_area = urban_area + edge_buffer.intersection(dictionary_id_geometry_urban[geom_id]).area
    
    green_ratio = (green_area/edge_buffer_area)*100
    urban_ratio = (urban_area/edge_buffer_area)*100

    return green_ratio-urban_ratio

"""
In the zone that the edge goes through what percentage is urban vs trees
"""
def urban_vs_green_cover():

    
    input_file = "../resources/Trees_only_data.gpkg"
    data_trees = gpd.read_file(input_file)
    data_trees.to_crs(epsg=32634 ,inplace=True)
    df_weights_projected.to_crs(epsg=32634,inplace=True)

    input_file = "../resources/Urban_only_data.gpkg"
    data_urban = gpd.read_file(input_file)
    data_urban.to_crs(epsg=32634 ,inplace=True)


    #Build a spatial index for the trees
    green_zones_indexed = STRtree(data_trees.geometry.values)
    urban_zones_indexed = STRtree(data_urban.geometry.values)

    dictionary_id_geometry_trees = create_id_geometry_tree(data_trees)
    dictionary_id_geometry_urban = create_id_geometry_tree(data_urban)

    threshold = 50

    df_weights_projected["tree_vs_urban_score"] = df_weights_projected.geometry.apply(
        lambda edge: calculate_area_ratio(edge,threshold,green_zones_indexed,urban_zones_indexed,dictionary_id_geometry_trees,dictionary_id_geometry_urban)
    )
    
    
    df_weights_projected.to_crs(epsg=4326,inplace=True)

"""
Checks if its close or intersects the line
"""
def check_intersection_or_closeness(line1, line2, threshold):
    # Check if the lines intersect
    if line1.intersects(line2):
        return True
    
    # Check if the lines are within the threshold distance
    if line1.distance(line2) <= threshold:
        return True
    
    return False

"""
calculate score for values smaller the better
"""
def calculate_traffic_score(edge,traffic_index_tree,taffic_gdf,threshold=5):
    
    edge_buffered = edge.buffer(threshold)

    traffic_indexes = traffic_index_tree.query(edge_buffered)

    value_of_traffic = 0
    for i in traffic_indexes:
        value_of_traffic = value_of_traffic + taffic_gdf["level"][i]
    
    if len(traffic_indexes) > 0:
        return value_of_traffic/len(traffic_indexes)
    return 0

"""
Calculates traffic score to roads.
"""
def calculate_traffic_values():
    directory = "../resources/table_data/"

    csv_files = [f for f in os.listdir(directory) if f.endswith('.csv') and f.startswith('jams')]
    csv_files.sort(key=lambda x: os.path.getmtime(os.path.join(directory,x)),reverse=True)
    latest_csv = csv_files[0]
    latest_csv_path = os.path.join(directory,latest_csv)

    traffic_df = pd.read_csv(latest_csv_path)
    geometries = traffic_df["geometry"]
    list_linestring = []
    for geometry_data in geometries:
        geo_data = ast.literal_eval(geometry_data)
        coords = []
       
        coords = [(point['x'],point['y']) for point in geo_data]
        list_linestring.append(LineString(coords))
    
    traffic_df["geometry"] = list_linestring
  

    traffic_gdf = gpd.GeoDataFrame(traffic_df,geometry="geometry")
    traffic_gdf.set_crs(epsg=epsg_c, inplace=True)
    traffic_gdf.to_crs(epsg=epsg_m, inplace=True)
    df_weights_projected.to_crs(epsg=epsg_m,inplace=True)
    
    
    traffic_zones_indexed = STRtree(traffic_gdf.geometry.values)
    df_weights_projected["traffic"] = df_weights_projected.geometry.apply(
        lambda edge: calculate_traffic_score(edge,traffic_zones_indexed,traffic_gdf)
    )

    df_weights_projected.to_crs(epsg=epsg_c,inplace=True)
    
"""
Refreshes all the resources.
"""
def refresh_resource_generator():
    settings = dict() 
    settings["tree_vs_urban_score"] = False
    settings["tree_cover_score"] = False
    settings["water_score"] = False
    settings["aqi"] = False
    settings["traffic"] = True
    settings["save"] = True
    initialization(settings)



if __name__ == "__main__":
    refresh_resource_generator()
    print(nodes_full)
    print(edges_full)
