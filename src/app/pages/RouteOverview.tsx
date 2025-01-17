import React, { useEffect, useState } from "react";
import MapboxGL from "@rnmapbox/maps";
import { mapboxToken } from "@/utils/apiHelper";
import { useColorScheme } from "react-native";
import Colors from "@/constants/Colors";

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface CoordinatesWaypoint {
  latitude: number;
  longitude: number;
}

interface RouteOverviewProps {
  startLocation: Coordinates | null;
  endLocation: Coordinates;
  waypoints: CoordinatesWaypoint[];
}

const RouteOverview: React.FC<RouteOverviewProps> = ({ startLocation, endLocation, waypoints }) => {
  const [route, setRoute] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const theme = useColorScheme() || "light";

  useEffect(() => {
    if (waypoints && waypoints.length >=2) {
      fetchMapboxRoute();
    }
    else {
      setRoute(null);
    }
  }, [waypoints]);

  const fetchMapboxRoute = async () => {
    setIsLoading(true);

    if (!waypoints || waypoints.length < 2) {
      setRoute(null);
      setIsLoading(false);
      return;
    }

    const coordinates = waypoints.map((waypoint) => `${waypoint.longitude}%2C${waypoint.latitude}`).join("%3B");

    const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${coordinates}?geometries=geojson&overview=full&access_token=${mapboxToken}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch route from Mapbox");
      }
      const data = await response.json();
      if (data.routes && data.routes.length > 0) {
        const geoJsonRoute = {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              geometry: {
                type: "LineString",
                coordinates: data.routes[0].geometry.coordinates,  // Fixed path
              },
            },
          ],
        };
        
        setRoute(geoJsonRoute);
      } else {
        console.warn("No routes found from Mapbox");
      }
    } catch (error) {
      console.error("Error fetching route from Mapbox:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return isLoading ? null : (
    route && (
      <MapboxGL.ShapeSource id="routeSource" shape={route}>
        <MapboxGL.LineLayer
          id="routeLine"
          style={{
            lineColor: Colors[theme].primary,
            lineWidth: 6,
            lineOpacity: 0.8,
            lineJoin: "round",
            lineCap: "round",
          }}
        />
      </MapboxGL.ShapeSource>
    )
  );
};

export default RouteOverview;