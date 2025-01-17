import React, { useState, useEffect, useCallback } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  useColorScheme,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Image,
  ImageSourcePropType,
} from "react-native";

import SearchBar from "../../components/HomePage/SearchBar";
import Colors from "@/constants/Colors";
import { API_URL, fetchData, refreshAccessToken } from "@/utils/apiHelper";
import { StackScreenProps } from "@react-navigation/stack";
import { RootStackParamList } from "..";
import FetchableImage from "@/components/FetchableImage";
import * as SecureStore from "expo-secure-store";

export const tagIcon = (icon: string): ImageSourcePropType => {
  const tagIcons: { [key: string]: ImageSourcePropType } = {
    Water: require("../../assets/tags-icons/Water.png"),
    Sunny: require("../../assets/tags-icons/Sunny.png"),
    Elevation: require("../../assets/tags-icons/Elevation.png"),
  };

  return tagIcons[icon] || require("../../assets/tags-icons/Undefined.png");
};

export type RouteItem = {
  id: number;
  title: string;
  distance: string;
  photos: string[];
  estimated_time: string;
  average_rating: string;
  user: {
    id: string;
    username: string;
    photo: string;
  };
  tags: string[];
};

type ExplorePageProps = StackScreenProps<RootStackParamList, "Explore">;

const ExplorePage: React.FC<ExplorePageProps> = ({ navigation }) => {
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const theme = useColorScheme() || "light";
  useEffect(() => {
    const fetchAccessToken = async () => {
      let token = await SecureStore.getItemAsync("accessToken");
      if (!token) {
        token = await refreshAccessToken();
      }
      setAccessToken(token);
    };

    const fetchRoutes = async () => {
      try {
        const data: RouteItem[] = await fetchData(
          `${API_URL}api/auth/routes/public/`
        );
        setRoutes(data);
        setError(null);
      } catch (error: any) {
        console.error("Error fetching routes:", error);
        setError("Could not load routes. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchAccessToken();
    fetchRoutes();
  }, []);

  const formatEstimatedTime = (timeString: string) => {
    const [hours, minutes, seconds] = timeString.split(":").map(Number);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    } else {
      return `${seconds}s`;
    }
  };

  const renderRouteItem = ({ item }: { item: RouteItem }) => (
    <TouchableOpacity
      style={[
        routeStyling.routeItem,
        { backgroundColor: Colors[theme].cardBackground },
      ]}
      onPress={() => navigation.navigate("RouteView", { routeData: item })}
    >
      {/* Title Row */}
      <View style={routeStyling.titleRow}>
        <Text
          style={[routeStyling.titleText, { color: Colors[theme].primary }]}
        >
          {item.title?.trim() || "Unnamed Route"}
        </Text>
        <View style={routeStyling.userInfo}>
          <FetchableImage
            imageUrl={item.user.photo}
            defaultImage={require("../../assets/default-user.png")}
            style={routeStyling.userPicture}
          />
          <Text
            style={[routeStyling.usernameText, { color: Colors[theme].text }]}
          >
            {item.user.username}
          </Text>
        </View>
      </View>

      {/* Distance, Time, and Average Rating Row */}
      <View style={routeStyling.detailsRow}>
        <View style={routeStyling.leftDetails}>
          <Text
            style={[
              routeStyling.detailText,
              {
                color: Colors[theme].text,
                backgroundColor: Colors[theme].boxBackground,
              },
            ]}
          >
            {item.distance} km
          </Text>
          <Text
            style={[
              routeStyling.detailText,
              {
                color: Colors[theme].text,
                backgroundColor: Colors[theme].boxBackground,
              },
            ]}
          >
            {formatEstimatedTime(item.estimated_time)}
          </Text>
        </View>
        <Text
          style={[routeStyling.ratingText, { color: Colors[theme].primary }]}
        >
          {item.average_rating ? `${item.average_rating} ★` : "No rating"}
        </Text>
      </View>

      {/* Tags */}
      <View style={routeStyling.tagsRow}>
        {item.tags.map((tag, index) => (
          <Image
            key={index}
            source={tagIcon(tag)}
            style={{ width: 30, height: 30, marginRight: 5 }}
          />
        ))}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={Colors[theme].primary} />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: Colors[theme].background }]}
    >
      <View style={styles.searchBarContainer}>
        <SearchBar navigation={navigation} />
      </View>
      <FlatList
        data={routes}
        renderItem={renderRouteItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  routeItem: {
    padding: 15,
    borderRadius: 8,
    marginVertical: 5,
    alignItems: "center",
  },
  routeText: {
    fontSize: 16,
    color: "white",
    fontWeight: "bold",
  },
  errorText: {
    color: "red",
    fontSize: 16,
    textAlign: "center",
  },
  container: {
    flex: 1,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
  },
  listContainer: {
    paddingHorizontal: 10,
    paddingVertical: 0,
  },
  searchBarContainer: {
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  safeArea: {
    flex: 1,
  },
});

const routeStyling = StyleSheet.create({
  routeItem: {
    padding: 15,
    borderRadius: 8,
    marginVertical: 4,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  titleText: {
    fontSize: 16,
    fontWeight: "bold",
    flex: 1,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  userPicture: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 5,
  },
  usernameText: {
    marginLeft: 10,
    fontSize: 14,
  },
  detailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  leftDetails: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailText: {
    fontSize: 14,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 10,
  },
  ratingText: {
    fontSize: 14,
    textAlign: "right",
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 5,
  },
  tag: {
    fontSize: 12,
    color: "white",
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 5,
    marginBottom: 5,
  },
});

export default ExplorePage;
