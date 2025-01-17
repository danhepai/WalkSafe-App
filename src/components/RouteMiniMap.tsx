import React, { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import MapboxGL from "@rnmapbox/maps";
import { useColorScheme } from "react-native";
import RouteOverview from "../app/pages/RouteOverview";
import Colors from "@/constants/Colors";

/** Types **/
interface Coordinates {
  latitude: number;
  longitude: number;
}
interface CoordinatesWaypoint {
  latitude: number;
  longitude: number;
}
interface RouteMiniMapProps {
  startLocation: Coordinates | null;
  endLocation: Coordinates;
  waypoints: CoordinatesWaypoint[];
}

/**
 * A minimal map that embeds your RouteOverview component.
 */
const RouteMiniMap: React.FC<RouteMiniMapProps> = ({
  startLocation,
  endLocation,
  waypoints,
}) => {
  const theme = useColorScheme() || "light";
  const mapRef = useRef<MapboxGL.MapView>(null);
  const cameraRef = useRef<MapboxGL.Camera>(null);

  useEffect(() => {
    // Once the waypoints are loaded/fetched, 
    // you can optionally fit the map to the bounds of the route.
    if (waypoints.length > 0) {
      fitToRoute();
    }
  }, [waypoints]);

  const fitToRoute = () => {
    // For a 'mini-map', you may just show a default region or 
    // try to compute bounding box of your waypoints to fit them in view.
    // Example (very basic) approach: using the first and last waypoints
    // to roughly set the bounds. Feel free to compute a real bounding box
    // that includes *all* waypoints.
    
    // This example uses Camera's fitBounds method (added in @rnmapbox/maps 10+).
    // If you want to include all waypoints, you can find minLat, maxLat, minLng, maxLng 
    // from the entire array.  
    if (cameraRef.current && waypoints.length >= 2) {
      const minLat = Math.min(...waypoints.map((wp) => wp.latitude));
      const maxLat = Math.max(...waypoints.map((wp) => wp.latitude));
      const minLng = Math.min(...waypoints.map((wp) => wp.longitude));
      const maxLng = Math.max(...waypoints.map((wp) => wp.longitude));

      // Provide optional "padding" around the route so it doesn't sit at the edges
      const paddingTop = 30;
      const paddingRight = 30;
      const paddingBottom = 30;
      const paddingLeft = 30;

      cameraRef.current.fitBounds(
        [minLng, minLat],
        [maxLng, maxLat],
        1000, // animation duration in ms
        30,
      );
    }
  };

  return (
    <View style={styles.container}>
      <MapboxGL.MapView
        ref={mapRef}
        style={styles.map}
        styleURL={MapboxGL.StyleURL.Street}
        scrollEnabled={false}   // Disable scrolling for a mini-map (optional)
        zoomEnabled={false}     // Disable zoom gestures for a mini-map (optional)
        rotateEnabled={false}   // Disable rotation (optional)
      >
        {/* Camera to manage our viewpoint */}
        <MapboxGL.Camera ref={cameraRef} />

        {/* Your existing RouteOverview usage */}
        <RouteOverview
          startLocation={startLocation}
          endLocation={endLocation}
          waypoints={waypoints}
        />
      </MapboxGL.MapView>
    </View>
  );
};

export default RouteMiniMap;

/** Styles **/
const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: 200,  // Adjust the height to make it a 'mini' map
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 15,
  },
  map: {
    flex: 1,
  },
});
