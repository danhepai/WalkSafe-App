import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  useColorScheme,
  TouchableOpacity,
  Image,
} from "react-native";
import MapboxGL from "@rnmapbox/maps";
import * as Location from "expo-location";

import { StackScreenProps } from "@react-navigation/stack";
import { RootStackParamList } from "@/app";
import Colors from "@/constants/Colors";      // <-- Import your custom Colors
import { mapboxToken } from "@/utils/apiHelper";

// Extended Step interface to include bearing data for maneuver arrows
interface Step {
  instruction: string;
  distance: number; // in meters
  duration: number; // in seconds
  location: [number, number];
  bearing_after?: number;
  bearing_before?: number;
}

type NavigationViewProps = StackScreenProps<RootStackParamList, "NavigationView">;

const NAVIGATION_DISTANCE_THRESHOLD = 10; // meters
const INITIAL_ZOOM_LEVEL = 16;

const NavigationView: React.FC<NavigationViewProps> = ({ route, navigation }) => {
  const { waypoints } = route.params;

  const [steps, setSteps] = useState<Step[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [routeGeoJSON, setRouteGeoJSON] = useState<any>(null);
  const [arrowsGeoJSON, setArrowsGeoJSON] = useState<any>(null);

  const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null);
  const [heading, setHeading] = useState<number>(0);

  const [remainingStepDistance, setRemainingStepDistance] = useState<number>(0);
  const [routeDistance, setRouteDistance] = useState<number>(0);
  const [routeDuration, setRouteDuration] = useState<number>(0);

  // Tracks whether the map is currently centered on the user's location
  const [isCentered, setIsCentered] = useState<boolean>(true);

  const mapRef = useRef<MapboxGL.Camera | null>(null);
  const scheme = useColorScheme() || "light";
  const themeColors = Colors[scheme]; // Convenient reference to your theme's colors

  useEffect(() => {
    if (!waypoints || waypoints.length < 2) {
      Alert.alert("Invalid Input", "Waypoints are missing or invalid.");
      return;
    }
    fetchRouteData();
    startLocationTracking();
    return () => {
      stopLocationTracking();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waypoints]);

  /**
   * Fetch route + steps from Mapbox, storing step bearings for maneuver arrows
   */
  const fetchRouteData = async () => {
    try {
      const coordinateQuery = waypoints
        .map((wp) => `${wp.longitude}%2C${wp.latitude}`)
        .join("%3B");

      // Using overview=full for a smoother route
      const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${coordinateQuery}?steps=true&geometries=geojson&overview=full&access_token=${mapboxToken}`;
      const response = await fetch(url);
      const data = await response.json();

      if (!data.routes || !data.routes[0]) {
        Alert.alert("No route found", "Please check your selected waypoints.");
        return;
      }

      const route = data.routes[0];

      // Flatten steps from each leg
      const stepsData: Step[] = route.legs.flatMap((leg: any) =>
        leg.steps.map((step: any) => ({
          instruction: step.maneuver.instruction,
          distance: step.distance,
          duration: step.duration,
          location: step.maneuver.location,
          bearing_after: step.maneuver?.bearing_after || 0,
          bearing_before: step.maneuver?.bearing_before || 0,
        }))
      );
      setSteps(stepsData);
      setRouteDistance(route.distance);
      setRouteDuration(route.duration);

      // Build route geometry
      const routeGeoJsonData = {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: route.geometry,
            properties: {},
          },
        ],
      };
      setRouteGeoJSON(routeGeoJsonData);

      // Build arrow points for each step
      const arrowFeatures = stepsData.map((st) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: st.location, // [lng, lat]
        },
        properties: {
          bearing: st.bearing_after || 0,
          instruction: st.instruction,
        },
      }));
      setArrowsGeoJSON({
        type: "FeatureCollection",
        features: arrowFeatures,
      });

      // Initialize distance
      if (stepsData.length > 0) {
        setRemainingStepDistance(stepsData[0].distance);
      }
    } catch (error) {
      console.error("Error fetching route data:", error);
      Alert.alert("Error", "Failed to fetch navigation steps.");
    }
  };

  const startLocationTracking = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Denied", "Location access is required for navigation.");
      return;
    }

    await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 2000,
        distanceInterval: 1,
      },
      (location) => {
        const userLoc: [number, number] = [
          location.coords.longitude,
          location.coords.latitude,
        ];
        setCurrentLocation(userLoc);
        setHeading(location.coords.heading || 0);

        if (isCentered) {
          rotateCamera(userLoc, location.coords.heading || 0);
        }
        updateDistances(userLoc);
      }
    );
  };

  const stopLocationTracking = () => {
    // If using watchPositionAsync, store the subscription and remove it if needed.
  };

  const rotateCamera = (location: [number, number], headingValue: number) => {
    if (mapRef.current) {
      mapRef.current.setCamera({
        centerCoordinate: location,
        heading: headingValue,
        pitch: 45,             // tilt for a 3D perspective
        zoomLevel: INITIAL_ZOOM_LEVEL,
        animationDuration: 1000,
      });
    }
  };

  const updateDistances = (userLocation: [number, number]) => {
    if (steps.length === 0) return;
    const nextStep = steps[currentStepIndex];
    const dist = calculateDistance(userLocation, nextStep.location);
    setRemainingStepDistance(dist);

    if (dist < NAVIGATION_DISTANCE_THRESHOLD) {
      handleNextStep();
    }
  };

  const handleNextStep = () => {
    if (currentStepIndex >= steps.length - 1) {
      Alert.alert("Navigation Completed", "You have arrived at your destination!");
      return;
    }
    const nextIndex = currentStepIndex + 1;
    setCurrentStepIndex(nextIndex);
    setRemainingStepDistance(steps[nextIndex].distance);
  };

  const calculateDistance = (loc1: [number, number], loc2: [number, number]) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (loc1[1] * Math.PI) / 180;
    const φ2 = (loc2[1] * Math.PI) / 180;
    const Δφ = ((loc2[1] - loc1[1]) * Math.PI) / 180;
    const Δλ = ((loc2[0] - loc1[0]) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; 
  };

  const formatDuration = (totalSeconds: number): string => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${minutes} min${minutes !== 1 ? "s" : ""} ${seconds}s`;
  };

  const recenterCamera = () => {
    if (!currentLocation || !mapRef.current) return;
    rotateCamera(currentLocation, heading);
    setIsCentered(true);
  };

  const endNavigation = () => {
    Alert.alert("Navigation Ended", "You have stopped navigation.");
    navigation.goBack();
  };

  // Optional: dynamic icons based on direction
  const getManeuverIcon = (stepIndex: number) => {
    // For demo, just return a placeholder arrow. You could read bearing_after.
    return require("../../assets/icons/arrow.png");
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <MapboxGL.MapView
        style={styles.map}
        styleURL={
          scheme === "dark"
            ? "mapbox://styles/mapbox/dark-v11"
            : MapboxGL.StyleURL.Street
        }
        // If you want auto-center toggling on map drags:
        // onRegionDidChange={() => setIsCentered(false)}
      >
        {/* Register images (arrow used for step arrows) */}
        <MapboxGL.Images
          images={{
            arrow: require("../../assets/icons/arrow.png"),
          }}
        />

        <MapboxGL.Camera ref={mapRef} />

        {/* Show user's location on the map */}
        <MapboxGL.UserLocation
          visible
          showsUserHeadingIndicator
        />

        {/* The main route line (use themeColors.primary or secondary) */}
        {routeGeoJSON && (
          <MapboxGL.ShapeSource id="routeSource" shape={routeGeoJSON}>
            <MapboxGL.LineLayer
              id="routeLine"
              style={{
                lineColor: themeColors.primary,
                lineWidth: 5,
                lineOpacity: 0.8,
              }}
            />
          </MapboxGL.ShapeSource>
        )}

        {/* Step arrows */}
        {arrowsGeoJSON && (
          <MapboxGL.ShapeSource id="arrowsSource" shape={arrowsGeoJSON}>
            <MapboxGL.SymbolLayer
              id="arrowsLayer"
              style={{
                iconImage: "arrow",
                iconRotate: ["get", "bearing"],
                iconRotationAlignment: "map",
                iconAllowOverlap: true,
                iconSize: 0.8,
              }}
            />
          </MapboxGL.ShapeSource>
        )}

        {/* Markers for Start and End waypoints */}
        <MapboxGL.PointAnnotation
          id="start"
          coordinate={[waypoints[0].longitude, waypoints[0].latitude]}
        >
          <View style={[styles.markerStart, { backgroundColor: themeColors.primary }]}>
            <Text style={[styles.markerText, { color: themeColors.buttonText }]}>Start</Text>
          </View>
        </MapboxGL.PointAnnotation>

        <MapboxGL.PointAnnotation
          id="end"
          coordinate={[
            waypoints[waypoints.length - 1].longitude,
            waypoints[waypoints.length - 1].latitude,
          ]}
        >
          <View style={[styles.markerEnd, { backgroundColor: themeColors.secondary }]}>
            <Text style={[styles.markerText, { color: themeColors.buttonText }]}>End</Text>
          </View>
        </MapboxGL.PointAnnotation>
      </MapboxGL.MapView>

      {/* TOP BANNER: main step instructions + next step */}
      <View style={[styles.topBanner, { backgroundColor: themeColors.primary }]}>
        {/* Big instruction arrow */}
        <Image
          style={styles.instructionArrow}
          source={getManeuverIcon(currentStepIndex)}
        />
        {/* Current step instruction text */}
        <Text style={[styles.instructionText, { color: themeColors.buttonText }]}>
          {steps[currentStepIndex]?.instruction || "Loading..."}
        </Text>

        {/* Next step preview */}
        {steps[currentStepIndex + 1] && (
          <View style={styles.thenInstructionContainer}>
            <Text style={[styles.thenLabel, { color: themeColors.buttonText }]}>Then</Text>
            <Image
              style={[styles.thenArrow, { tintColor: themeColors.buttonText }]}
              source={getManeuverIcon(currentStepIndex + 1)}
            />
          </View>
        )}
      </View>

      {/* BOTTOM BAR: distance, ETA, recenter, end nav */}
      <View style={[styles.bottomBar, { backgroundColor: themeColors.surface }]}>
        {/* Exit button */}
        <TouchableOpacity style={styles.exitButton} onPress={endNavigation}>
          <Text style={[styles.exitButtonText, { color: themeColors.error }]}>X</Text>
        </TouchableOpacity>

        {/* Route info: distance + ETA */}
        <View style={styles.routeInfoContainer}>
          <Text style={[styles.durationText, { color: themeColors.text }]}>
            {formatDuration(routeDuration)}
          </Text>
          <Text style={[styles.distanceText, { color: themeColors.textLight }]}>
            {(routeDistance / 1000).toFixed(1)} km
          </Text>
        </View>

        {/* Recenter button */}
        <TouchableOpacity onPress={recenterCamera} style={styles.recenterButton}>
          <Text style={[styles.recenterButtonText, { color: themeColors.buttonText }]}>
            Re-center
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default NavigationView;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },

  /* ---------- TOP BANNER Styles ---------- */
  topBanner: {
    position: "absolute",
    top: 0,
    width: "100%",
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 999,
  },
  instructionArrow: {
    width: 32,
    height: 32,
    resizeMode: "contain",
    marginRight: 10,
  },
  instructionText: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
  },
  thenInstructionContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 12,
  },
  thenLabel: {
    fontSize: 14,
    marginRight: 4,
  },
  thenArrow: {
    width: 24,
    height: 24,
    resizeMode: "contain",
  },

  /* ---------- MARKERS ---------- */
  markerStart: {
    padding: 6,
    borderRadius: 8,
  },
  markerEnd: {
    padding: 6,
    borderRadius: 8,
  },
  markerText: {
    fontWeight: "bold",
  },

  /* ---------- BOTTOM BAR Styles ---------- */
  bottomBar: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  exitButton: {
    marginRight: 16,
  },
  exitButtonText: {
    fontSize: 18,
    fontWeight: "600",
  },
  routeInfoContainer: {
    flex: 1,
    alignItems: "center",
  },
  durationText: {
    fontSize: 18,
    fontWeight: "600",
  },
  distanceText: {
    fontSize: 14,
    marginTop: 2,
  },
  recenterButton: {
    marginLeft: 16,
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  recenterButtonText: {
    fontWeight: "600",
  },
});
