import React, { useState, useEffect, useRef } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  FlatList,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useColorScheme } from "react-native";
import { useNavigation } from "@react-navigation/native";
import Colors from "@/constants/Colors";
import { mapboxToken, fetchData, API_URL } from "@/utils/apiHelper";
import ProfilePictureHeader from "@/components/ProfilePictureHeader";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "..";
import { TouchableWithoutFeedback } from "react-native-gesture-handler";
import {RouteItem as BaseRouteItem} from "@/app/pages/RoutesList";
import * as SecureStore from "expo-secure-store";

// Custom UUID generator to avoid crypto.getRandomValues error
const generateSessionToken = () => {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
};

type SearchResult = {
  id: number;
  text: string;
  place_name: string;
  coordinates: { latitude: number; longitude: number } | null;
  distance?: number;
  mapbox_id?: string;
  feature_type?: string;
};

type RouteItem = BaseRouteItem & {
  name: string;
  created_at: string;
  title?: string;
  distance: number;
  tags: string[];
};

type TagType = {
  id: number;
  name: string;
}

type SearchPageNavigationProp = StackNavigationProp<
  RootStackParamList,
  "Search"
>;

const SearchPage: React.FC = () => {
  const [query, setQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [recentRoutes, setRecentRoutes] = useState<RouteItem[]>([]);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [sessionToken, setSessionToken] = useState<string>(
    generateSessionToken()
  );
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [allTags, setAllTags] = useState<TagType[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);

  const theme = useColorScheme() || "light";
  const navigation = useNavigation<SearchPageNavigationProp>();

  useEffect(() => {
    const getLocation = async (retries = 3) => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          console.log("Permission to access location was denied");
          return;
        }

        const location = await Location.getCurrentPositionAsync({});
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      } catch (error) {
        if (retries > 0) {
          console.warn(
            `Retrying to fetch location... Attempts left: ${retries}`
          );
          setTimeout(() => getLocation(retries - 1), 1000);
        } else {
          console.error("Failed to fetch user location after retries:", error);
        }
      }
    };

    getLocation();
  }, []);

  useEffect(() => {
    const getTags = async () => {
      try {
        const response = await fetchData(`${API_URL}api/tags/`);
        setAllTags(response);
      } catch (error) {
        console.error("Failed to fetch tags:", error);
      }
    };
    getTags();
  }, []);

  const handleTagPress = (tagId: number) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  };

  useEffect(() => {
    const fetchRecentRoutes = async () => {
      try {
        const data: RouteItem[] = await fetchData(`${API_URL}api/auth/routes/`);

        // Sort by creation date and limit to 5 most recent routes
        const sortedRoutes = data.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        setRecentRoutes(sortedRoutes.slice(0, 5));
      } catch (error) {
        console.error("Error fetching recent routes:", error);
      }
    };
    fetchRecentRoutes();
  }, []);

  const fetchCoordinates = async (
    mapboxId: string
  ): Promise<SearchResult | null> => {
    try {
      const url = `https://api.mapbox.com/search/searchbox/v1/retrieve/${mapboxId}?session_token=${sessionToken}&access_token=${mapboxToken}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Failed to fetch location details from Searchbox API");
      }

      const data = await response.json();

      const feature = data.features?.[0];
      if (feature) {
        const { geometry, properties } = feature;
        return {
          id: properties.mapbox_id,
          text: properties.name || "Unnamed location",
          place_name:
            properties.full_address ||
            properties.place_formatted ||
            "Unknown address",
          coordinates: {
            latitude: geometry.coordinates[1],
            longitude: geometry.coordinates[0],
          },
        };
      }

      console.warn("No features found for the given mapbox_id:", mapboxId);
      return null;
    } catch (error) {
      console.error("Error fetching location details:", error);
      return null;
    }
  };

  const fetchSearchResults = async (query: string) => {
    if (!userLocation) {
      console.error("User location is not available for search.");
      return;
    }

    setIsLoading(true);

    try {
      const { latitude, longitude } = userLocation;
      const url = `https://api.mapbox.com/search/searchbox/v1/suggest?q=${encodeURIComponent(
        query
      )}&language=en&proximity=${longitude},${latitude}&session_token=${sessionToken}&access_token=${mapboxToken}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Failed to fetch suggestions from Searchbox API");
      }

      const data = await response.json();

      const results =
        data.suggestions?.map((suggestion: any, index: number) => {
          const {
            name,
            full_address,
            id,
            mapbox_id,
            distance,
            feature_type,
          } = suggestion;
          return {
            id: id || `${name}-${index}`, // Ensure a unique key by combining text and index
            text: name || "Unnamed location",
            place_name: full_address || "Unknown address",
            coordinates: null,
            distance: distance
              ? (distance / 1000).toFixed(2).replace(/\.00$/, "")
              : undefined, // Convert meters to kilometers
            mapbox_id,
            feature_type,
          };
        }) || [];

      setSearchResults(results);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectLocation = async (location: SearchResult) => {
    if (!location.mapbox_id) {
      console.error("Missing mapbox_id for location");
      return;
    }

    const detailedLocation = await fetchCoordinates(location.mapbox_id);

    if (detailedLocation && detailedLocation.coordinates) {
      navigation.navigate("Home", {
        startLocation: userLocation,
        selectedCoordinates: detailedLocation.coordinates,
        selectedPlaceName: detailedLocation.place_name,
        selectedTags: selectedTagIds,
      });
      setSessionToken(generateSessionToken());
    } else {
      console.error("Failed to retrieve detailed location data.");
    }

  };

  const handleSelectRecentRoute = async (routeId: number) => {
    try {
      const accessToken = await SecureStore.getItemAsync("accessToken");
      if (!accessToken) {
        throw new Error("No access token found.");
      }
  
      const response = await fetch(`${API_URL}api/auth/route/${routeId}/`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });
  
      if (!response.ok) {
        throw new Error("Failed to fetch route details.");
      }
  
      const data = await response.json();
  
      // Convert lat and long to numbers
      const formattedRoute = data.route.map((point: any) => ({
        latitude: parseFloat(point.lat),
        longitude: parseFloat(point.long),
      }));
  
      console.log("Selected route details:", formattedRoute);
  
      // Pass numeric coordinates to the Home page
      navigation.navigate("Home", {
        startLocation: formattedRoute[0],
        selectedCoordinates: formattedRoute[formattedRoute.length - 1],
        selectedPlaceName: data.title,
        waypoints: formattedRoute,
      });
    } catch (error) {
      console.error("Error fetching route details:", error);
      Alert.alert("Error", "Could not load route details.");
    }
  };
  


  const goBack = () => {
    navigation.goBack();
  };

  const handleInputChange = (text: string) => {
    setQuery(text);

    if (!userLocation) {
      console.warn("Waiting for user location...");
      return;
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (text.trim() !== "") {
      typingTimeoutRef.current = setTimeout(() => {
        fetchSearchResults(text);
      }, 500);
    } else {
      setSearchResults([]);
    }
  };

  return (
    <View
      style={[styles.container, { backgroundColor: Colors[theme].background }]}
    >
      <View style={styles.overlay} pointerEvents="box-none">
        <TouchableOpacity onPress={goBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors[theme].primary} />
        </TouchableOpacity>
        <ProfilePictureHeader navigation={navigation} />
      </View>

      <TextInput
        style={[
          styles.input, // Static styles from StyleSheet
          {
            backgroundColor: Colors[theme].searchBarBackground, // Dynamic background color
            color: Colors[theme].text, // Dynamic text color
            borderColor: Colors[theme].searchBarBorder, // Dynamic border color
          },
        ]}
        placeholder="Search for a location..."
        placeholderTextColor={Colors[theme].text}
        value={query}
        onChangeText={handleInputChange}
        autoFocus
      />

      {/* Horizontal Tag Selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tagsContainer}
      >
        {allTags.map((tag) => {
          const isSelected = selectedTagIds.includes(tag.id);
          return (
            <TouchableOpacity
              key={tag.id}
              style={[
                styles.tagItem,
                {
                  backgroundColor: isSelected
                    ? Colors[theme].primary
                    : Colors[theme].cardBackground,
                  borderColor: isSelected
                    ? Colors[theme].primary
                    : Colors[theme].searchBarBorder,
                },
              ]}
              onPress={() => handleTagPress(tag.id)}
            >
              <Text
                style={[
                  styles.tagText,
                  { color: isSelected ? Colors[theme].buttonText : Colors[theme].text },
                ]}
              >
                {tag.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {query.trim() === "" && recentRoutes.length > 0 && (
        <FlatList
          data={recentRoutes}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => handleSelectRecentRoute(Number(item.id))}
              style={[
                styles.resultItem,
                {
                  backgroundColor: Colors[theme].cardBackground,
                  shadowColor: Colors[theme].shadow,
                },
              ]}
            >
              <Ionicons
                name="time-outline"
                size={24}
                color={Colors[theme].primary}
                style={styles.resultIcon}
              />
              <View style={styles.resultTextContainer}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={[
                      styles.resultTitle,
                      { color: Colors[theme].textLight, flexShrink: 1 },
                    ]}
                  >
                    {item.title?.trim()}
                  </Text>
                </View>

                {/* Render Tags Below */}
                {item.tags && item.tags.length > 0 && (
                <TouchableWithoutFeedback>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.tagsContainer}
                  >
                    {item.tags &&
                      item.tags.map((tag, index) => (
                        <View
                          key={index}
                          style={[
                            styles.tag,
                            { backgroundColor: Colors[theme].primary, borderRadius: 12 },
                          ]}
                        >
                          <Text style={styles.tagText}>{tag}</Text>
                        </View>
                      ))}
                  </ScrollView>
                </TouchableWithoutFeedback>
                )}
              </View>
              <Text
                style={[
                  styles.resultDescription,
                  { color: Colors[theme].descriptionText, marginLeft: 10 },
                ]}
              >
                {item.distance
                  ? `${item.distance} km away`
                  : "No distance available"}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}

      {isLoading ? (
        <ActivityIndicator size="large" color={Colors[theme].primary} />
      ) : (
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.resultItem,
                {
                  backgroundColor: Colors[theme].cardBackground,
                  shadowColor: Colors[theme].shadow,
                },
              ]}
              onPress={() => handleSelectLocation(item)}
            >
              <Ionicons
                name={
                  item.feature_type === "brand"
                    ? "storefront-outline"
                    : "location-outline"
                }
                size={28}
                color={Colors[theme].primary}
                style={styles.resultIcon}
              />
              <View style={styles.resultTextContainer}>
                <Text
                  style={[styles.resultTitle, { color: Colors[theme].primary }]}
                >
                  {item.text}
                </Text>
                <Text style={[styles.resultDescription, {color:Colors[theme].descriptionText}]}>{item.feature_type === "brand" ? "Brand" : item.place_name}</Text>
                {item.distance && (
                  <Text style={[styles.resultDistance, {color:Colors[theme].descriptionText}]}>
                    {item.distance} km away
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            query && !searchResults.length ? (
              <Text style={[styles.emptyText, { color: Colors[theme].text }]}>
                No results found
              </Text>
            ) : null
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 10,
  },
  overlay: {
    position: "absolute",
    top: 15,
    left: 15,
    right: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    height: 40,
    zIndex: 1,
    pointerEvents: "box-none",
  },
  backButton: {
    padding: 5,
  },
  input: {
    width: "100%",
    height: 50,
    paddingLeft: 60,
    paddingRight: 60,
    borderWidth: 1,
    borderRadius: 25,
    marginTop: 0,
    marginBottom: 10,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    marginRight: 10,
  },
  tagsContainer: {
    height: 40,
    marginBottom: 10,
    paddingHorizontal: 12,
  },
  tagItem: {
    height:30,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 15,
    marginRight: 10,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 14,
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resultIcon: {
    marginRight: 15,
  },
  resultTextContainer: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  resultDescription: {
    fontSize: 14,
    marginTop: 2,
  },
  resultDistance: {
    fontSize: 12,
    marginTop: 4,
  },
  emptyText: {
    textAlign: "center",
    marginTop: 20,
    fontSize: 16,
  },
});


export default SearchPage;
