import React, { useState, useEffect, useCallback } from "react";
import {
  SafeAreaView,
  View,
  ActivityIndicator,
  StyleSheet,
  useColorScheme,
  Platform,
} from "react-native";
import Map from "../../components/HomePage/Map";
import TagsList from "../../components/HomePage/TagsList";
import SearchBar from "../../components/HomePage/SearchBar";
import { useFocusEffect, useRoute } from "@react-navigation/native";
import * as Location from "expo-location";
import Colors from "@/constants/Colors";
import { API_URL, mapboxToken, refreshAccessToken } from "@/utils/apiHelper";
import { StackScreenProps } from "@react-navigation/stack";
import { RootStackParamList } from "..";

type HomePageProps = StackScreenProps<RootStackParamList, "Home">;

const HomePage: React.FC<HomePageProps> = ({ navigation }) => {
  const theme = useColorScheme() || "light";
  const route = useRoute<HomePageProps["route"]>();

  const selectedPlaceName = route.params?.selectedPlaceName ?? "Undefined";

  const [tags, setTags] = useState<{ id: number; name: string }[]>([]);
  const [loadingTags, setLoadingTags] = useState(true);
  const [selectedCoordinates, setSelectedCoordinates] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [isLoadingMap, setIsLoadingMap] = useState(true);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  useEffect(() => {
    // Fetch the current user's location when the map is first loaded.
    const fetchCurrentLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          console.error("Permission to access location was denied");
          setIsLoadingMap(false);
          return;
        }

        const location = await Location.getCurrentPositionAsync({});
        const coords = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
        setUserLocation(coords); // Set user's location but leave selectedCoordinates null.
        setIsLoadingMap(false);
      } catch (error) {
        console.error("Error fetching current location:", error);
        setIsLoadingMap(false);
      }
    };

    fetchCurrentLocation();
  }, []);

  useFocusEffect(
    useCallback(() => {
      // Update selectedCoordinates if passed via route params.
      if (route.params?.selectedCoordinates) {
        setSelectedCoordinates(route.params.selectedCoordinates);
        console.log("Updated Coordinates:", route.params.selectedCoordinates);
      }
    }, [route.params])
  );

  useEffect(() => {
    // Fetch tags for the search bar or other UI elements.
    const fetchTags = async () => {
      try {
        const token = await refreshAccessToken();
        const response = await fetch(`${API_URL}api/tags/displayable/`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch tags");
        }

        const data = await response.json();
        setTags(data);
      } catch (error) {
        console.error("Failed to fetch tags:", error);
      } finally {
        setLoadingTags(false);
      }
    };

    fetchTags();
  }, []);

  return (
    <SafeAreaView style={styles.safeContainer}>
      <View style={styles.mapWrapper}>
        {isLoadingMap ? (
          <ActivityIndicator size="large" color={Colors[theme].primary} />
        ) : (
          <Map
            startLocation={route.params?.startLocation ?? userLocation}
            selectedCoordinates={route.params?.selectedCoordinates}
            selectedPlaceName={selectedPlaceName}
            userLocation={userLocation}
            waypoints={route.params?.waypoints ?? []}
          />
        )}
      </View>
      <View style={styles.overlayContainer}>
        <SearchBar navigation={navigation} />
        {loadingTags ? (
          <ActivityIndicator
            size="small"
            color={Colors[theme].primary}
            style={styles.loader}
          />
        ) : (
          <TagsList tags={tags} theme={theme} />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: "white",
  },
  overlayContainer: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 20,
    left: 0,
    right: 0,
    zIndex: 1,
    paddingHorizontal: 15,
    paddingVertical: 10,
    alignItems: "center",
  },
  loader: {
    marginTop: 10,
  },
  mapWrapper: {
    flex: 1,
  },
});

export default HomePage;
