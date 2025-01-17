import React, { useEffect, useState, useRef } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  useColorScheme,
  Alert,
  Text,
} from "react-native";
import MapboxGL from "@rnmapbox/maps";
import * as Location from "expo-location";
import Colors from "@/constants/Colors";
import * as SecureStore from "expo-secure-store";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "@/app";
import RouteOverview from "../../app/pages/RouteOverview"; // Import the RouteOverview component
import { API_URL } from "@/utils/apiHelper";

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface MapProps {
  startLocation: Coordinates | null;
  selectedCoordinates?: Coordinates | null;
  selectedPlaceName?: string;
  userLocation?: Coordinates | null;
  waypoints?: Coordinates[];
}

type MapNavigationProp = StackNavigationProp<RootStackParamList, "Home">;

const Map: React.FC<MapProps> = ({
  startLocation,
  selectedCoordinates,
  selectedPlaceName,
  waypoints,
}) => {
  const [currentLocation, setCurrentLocation] = useState<Coordinates | null>(
    null
  );
  const theme = useColorScheme() || "light";
  const mapRef = useRef<MapboxGL.Camera | null>(null);
  const [isCameraCentered, setIsCameraCentered] = useState(true);
  const [showRoute, setShowRoute] = useState(false);
  const [routeData, setRouteData] = useState<any | null>(null);

    const navigation = useNavigation<MapNavigationProp>();

  useEffect(() => {
    let locationSubscription: Location.LocationSubscription | null = null;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.error("Permission to access location was denied");
        return;
      }

      // 1) Get current location immediately:
      const initialLoc = await Location.getCurrentPositionAsync({});
      setCurrentLocation({
        latitude: initialLoc.coords.latitude,
        longitude: initialLoc.coords.longitude,
      });

      // 2) Then watch location changes (if user moves):
      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 2000,
          distanceInterval: 1,
        },
        (loc) => {
          setCurrentLocation({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });
        }
      );
    })();

    // Cleanup on unmount
    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, []);

  useEffect(() => {
    if (currentLocation && mapRef.current && isCameraCentered) {
      mapRef.current.setCamera({
        centerCoordinate: [currentLocation.longitude, currentLocation.latitude],
        zoomLevel: 14,
        animationDuration: 1000,
      });
    }
  }, [currentLocation, isCameraCentered]);

  useEffect(() => {
    if (selectedCoordinates && mapRef.current) {
      mapRef.current.setCamera({
        centerCoordinate: [
          selectedCoordinates.longitude,
          selectedCoordinates.latitude,
        ],
        zoomLevel: 14,
        animationDuration: 1000,
      });
      setIsCameraCentered(false);
      setShowRoute(false);
    }
  }, [selectedCoordinates]);

  useEffect(() => {
    if (waypoints && waypoints.length >= 2) {
      setRouteData(waypoints);
      setShowRoute(true);
    } else {
      setShowRoute(false);
      setRouteData(null);
    }
  }, [waypoints]);

  const recenterCamera = () => {
    if (currentLocation && mapRef.current) {
      mapRef.current.setCamera({
        centerCoordinate: [currentLocation.longitude, currentLocation.latitude],
        zoomLevel: 14,
        animationDuration: 1000,
      });
      setIsCameraCentered(true);
    }
  };

  const handleMapInteraction = () => {
    setIsCameraCentered(false);
  };

  const handleGetRoute = async () => {
    try {
      if (showRoute) {
        setShowRoute(false);
      }
      const accessToken = await SecureStore.getItemAsync("accessToken");
      if (!accessToken) {
        throw new Error("Access token not found");
      }

      const response = await fetch(`${API_URL}api/auth/route/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          start_latitude: currentLocation?.latitude,
          start_longitude: currentLocation?.longitude,
          end_latitude: selectedCoordinates?.latitude,
          end_longitude: selectedCoordinates?.longitude,
          tag_ids: [],
          title: selectedPlaceName,
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to fetch route");
      }
      const data = await response.json();

      // Convert lat/long strings to numeric latitude/longitude
      const formattedRoute = data.route.map((point: any) => ({
        latitude: parseFloat(point.lat),
        longitude: parseFloat(point.long),
      }));

      setRouteData(formattedRoute);

      setShowRoute(true);
    } catch (error) {
      console.error("Error fetching route:", error);
      Alert.alert("Error", "Failed to fetch route. Please try again later.");
    }
  };

  const handleCancelRoute = () => {
    setShowRoute(false);
    setRouteData(null);
  };

  const handleStartNavigation = () => {
    // Only navigate if we have route data
    if (routeData && routeData.length >= 2) {
      navigation.navigate("NavigationView", {
        waypoints: routeData,
      });
      console.log("Navigating to NavigationView with route data:", routeData);
    } else {
      Alert.alert("No route", "Please fetch a route before starting navigation.");
    }
  };

  return (
    <View style={styles.container}>
      {currentLocation ? (
        <>
          <MapboxGL.MapView
            style={styles.map}
            styleURL={
              theme === "dark"
                ? "mapbox://styles/mapbox/dark-v11"
                : MapboxGL.StyleURL.Street
            }
            onTouchStart={handleMapInteraction}
          >
            <MapboxGL.Camera ref={mapRef} />

            {currentLocation && (
              <MapboxGL.MarkerView
                id="current-location"
                coordinate={[
                  currentLocation.longitude,
                  currentLocation.latitude,
                ]}
              >
                <View style={styles.annotationContainer}>
                  <View style={styles.annotationFill} />
                </View>
              </MapboxGL.MarkerView>
            )}

            {selectedCoordinates && (
              <MapboxGL.MarkerView
                id="selected-location"
                coordinate={[
                  selectedCoordinates.longitude,
                  selectedCoordinates.latitude,
                ]}
                key={`${selectedCoordinates.latitude},${selectedCoordinates.longitude}`}
              >
                <Image
                  source={require("../../assets/icons/marker.png")}
                  style={styles.selectedMarkerIcon}
                />
              </MapboxGL.MarkerView>
            )}

            {showRoute && selectedCoordinates && routeData && (
              <RouteOverview
                startLocation={
                  startLocation ??
                  currentLocation ?? { latitude: 0, longitude: 0 }
                }
                endLocation={selectedCoordinates}
                waypoints={routeData}
              />
            )}
          </MapboxGL.MapView>

          <TouchableOpacity
            style={[
              styles.recenterButton,
              selectedCoordinates ? { bottom: 130 } : { bottom: 80 },
            ]}
            onPress={recenterCamera}
          >
            <Image
              source={
                isCameraCentered
                  ? require("../../assets/icons/location-crosshairs-active.png")
                  : require("../../assets/icons/location-crosshairs.png")
              }
              style={styles.recenterIcon}
            />
          </TouchableOpacity>

          {selectedCoordinates && (
            <View style={styles.routeOptions}>
              {!showRoute ? (
                <TouchableOpacity
                  style={[
                    styles.routeButton,
                    { backgroundColor: Colors[theme].primary },
                  ]}
                  onPress={handleGetRoute}
                >
                  <Text
                    style={[
                      styles.routeText,
                      { color: Colors[theme].buttonText },
                    ]}
                  >
                    Get Route
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.routeButton,
                    { backgroundColor: Colors[theme].secondary },
                  ]}
                  onPress={handleCancelRoute}
                >
                  <Text style={[styles.routeText, { color: "white" }]}>
                    Cancel Route
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[
                  styles.routeButton,
                  { backgroundColor: Colors[theme].primary },
                ]}
                onPress={handleStartNavigation}
              >
                <Text
                  style={[
                    styles.routeText,
                    { color: Colors[theme].buttonText },
                  ]}
                >
                  Start
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      ) : (
        <ActivityIndicator size="large" color={Colors[theme].primary} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  map: {
    flex: 1,
    width: "100%",
  },
  annotationContainer: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  annotationFill: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.dark.primary,
  },
  selectedMarkerIcon: {
    width: 25,
    height: 25,
    zIndex: 1000,
  },
  recenterButton: {
    position: "absolute",
    right: 10,
    bottom: 80,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  recenterIcon: {
    width: 40,
    height: 40,
  },
  routeOptions: {
    position: "absolute",
    bottom: 90,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  routeButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  routeText: {
    fontSize: 16,
  },
  routeOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.2)", // Optional dim effect
    zIndex: 1000,
  },
});

export default Map;
