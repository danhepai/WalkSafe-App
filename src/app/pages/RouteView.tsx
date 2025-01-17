import React, { useEffect, useState, useRef } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Image,
  useColorScheme,
} from "react-native";
import { StackScreenProps } from "@react-navigation/stack";
import Colors from "@/constants/Colors";
import FetchableImage from "@/components/FetchableImage";
import { tagIcon } from "./ExplorePage";
import { RootStackParamList } from "..";
import { API_URL, fetchData } from "@/utils/apiHelper";

// 1) Import @rnmapbox/maps & your RouteOverview
import MapboxGL from "@rnmapbox/maps";
import RouteOverview from "./RouteOverview"; // Adjust path as needed

export type RouteViewProps = StackScreenProps<RootStackParamList, "RouteView">;

const RouteView: React.FC<RouteViewProps> = ({ route }) => {
  // The route param with id
  const routeId = route.params?.routeData.id;  
  const cameraRef = useRef<MapboxGL.Camera>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [routeData, setRouteData] = useState<any>(null);
  const [mapLoaded, setMapLoaded] = useState<boolean>(false);
  const theme = useColorScheme() || "light";

  useEffect(() => {
    // Fetch from your API, e.g.: GET /api/auth/route/59
    const getRouteData = async () => {
      try {
        const data = await fetchData(`${API_URL}api/auth/route/${routeId}`);
        setRouteData(data);
      } catch (error) {
        console.error("Error fetching route data:", error);
      } finally {
        setLoading(false);
      }
    };
    getRouteData();
  }, [routeId]);

  // Convert routeData.route (array of { lat: string, long: string }) 
  // to numeric waypoints (array of { latitude: number, longitude: number })
  const mappedWaypoints =
    routeData?.route?.map((point: { lat: string; long: string }) => ({
      latitude: parseFloat(point.lat),
      longitude: parseFloat(point.long),
    })) || [];

  // The first coordinate is the start; last is end
  const startLocation =
    mappedWaypoints.length > 0 ? mappedWaypoints[0] : null;
  const endLocation =
    mappedWaypoints.length > 0
      ? mappedWaypoints[mappedWaypoints.length - 1]
      : { latitude: 0, longitude: 0 }; // fallback

      useEffect(() => {
        if (!cameraRef.current || mappedWaypoints.length < 2 || !mapLoaded) return;
    
        // Compute min/max latitude and longitude
        const latArray = mappedWaypoints.map((wp:any) => wp.latitude);
        const lngArray = mappedWaypoints.map((wp:any) => wp.longitude);
        const minLat = Math.min(...latArray);
        const maxLat = Math.max(...latArray);
        const minLng = Math.min(...lngArray);
        const maxLng = Math.max(...lngArray);
    
        // Provide a little “padding” around the edges
        // The 3rd parameter (padding) in fitBounds is a single number in older versions.
        // If your version supports edge insets, you can pass an object. Otherwise, just pass a number.
        const padding = 10; // or 100, etc.
    
        // The 4th parameter is the animation duration in ms (optional).
        // If your version has a different signature, adjust accordingly.
        cameraRef.current.fitBounds([minLng, minLat], [maxLng, maxLat], padding, 1000);
      }, [mappedWaypoints, mapLoaded]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={Colors[theme].primary} />
      </SafeAreaView>
    );
  }

  if (!routeData) {
    // In case the request fails or returns null
    return (
      <SafeAreaView style={styles.container}>
        <Text style={{ textAlign: "center", marginTop: 20 }}>
          No route data found
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: Colors[theme].background },
      ]}
    >
      <ScrollView contentContainerStyle={styles.contentContainer}>

        {/* Title */}
        <Text style={[styles.title, { color: Colors[theme].text }]}>
          {routeData.title || "Unnamed Route"}
        </Text>

        {/* Mini-Map Container (only if waypoints have at least two points) */}
        {mappedWaypoints.length >= 2 && (
          <View style={styles.miniMapContainer}>
            <MapboxGL.MapView
              style={styles.map}
              styleURL={
                            theme === "dark"
                              ? "mapbox://styles/mapbox/dark-v11"
                              : MapboxGL.StyleURL.Street
                          }
              scrollEnabled={false}
              zoomEnabled={false}
              rotateEnabled={false}
              onDidFinishRenderingFrameFully={()=>{setMapLoaded(true)}}
            >
              <RouteOverview
                startLocation={startLocation}
                endLocation={endLocation}
                waypoints={mappedWaypoints}
              />

              {/* Example camera setup: center on the first point at zoomLevel 12 */}
              <MapboxGL.Camera ref={cameraRef} />
            </MapboxGL.MapView>
          </View>
        )}

        {/* Details Container */}
        <View style={styles.detailsContainer}>
          <Text style={[styles.detailText, { color: Colors[theme].text }]}>
            Distance: {routeData.distance} km
          </Text>
          <Text style={[styles.detailText, { color: Colors[theme].text }]}>
            Estimated Time: {routeData.estimated_time}
          </Text>
          <Text style={[styles.detailText, { color: Colors[theme].text }]}>
            Rating: {routeData.average_rating || "No rating"} ★
          </Text>
        </View>

        {/* User Info Container */}
        {routeData.user && (
          <View style={styles.userInfoContainer}>
            <Text style={[styles.subtitle, { color: Colors[theme].text }]}>
              Created by:
            </Text>
            <View style={styles.userRow}>
              <FetchableImage
                imageUrl={routeData.user.photo}
                defaultImage={require("../../assets/default-user.png")}
                style={styles.userImage}
              />
              <Text style={[styles.username, { color: Colors[theme].text }]}>
                {routeData.user.username}
              </Text>
            </View>
          </View>
        )}

        {/* Tags Container */}
        {routeData.tags && routeData.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            <Text style={[styles.subtitle, { color: Colors[theme].text }]}>
              Tags:
            </Text>
            <View style={styles.tagsRow}>
              {routeData.tags.map((tag: string, index: number) => (
                <View key={index} style={styles.tag}>
                  <Text style={{ color: "white", marginRight: 5 }}>{tag}</Text>
                  <Image
                    source={tagIcon(tag)}
                    style={{ width: 30, height: 30 }}
                  />
                </View>
              ))}
            </View>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
};

/** STYLES **/
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  contentContainer: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  miniMapContainer: {
    width: "100%",
    height: 200, // "Mini" map height
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 15,
  },
  map: {
    flex: 1,
  },
  routeImage: {
    width: "100%",
    height: 200,
    borderRadius: 10,
    marginBottom: 15,
    resizeMode: "cover",
  },
  detailsContainer: {
    marginBottom: 20,
  },
  detailText: {
    fontSize: 16,
    marginBottom: 5,
  },
  userInfoContainer: {
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 5,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  userImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  username: {
    fontSize: 16,
  },
  tagsContainer: {
    marginBottom: 20,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    marginRight: 5,
    marginBottom: 5,
  },
});

export default RouteView;
