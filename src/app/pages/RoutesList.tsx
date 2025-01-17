import React, { useState, useEffect } from "react";
import {
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { API_URL } from "@/utils/apiHelper";
import Colors from "@/constants/Colors";
import { useColorScheme } from "react-native";
import { RootStackParamList } from "../index"; // Adjust the path if needed
import * as SecureStore from "expo-secure-store";
import { refreshAccessToken } from "@/utils/apiHelper";

export type RouteItem = {
  id: number;
  title: string;
  photos: string[];
  distance: string;
  estimated_time: string;
  average_rating?: string;
  user: {
    id: string;
    username: string;
    photo: string;
  };
  tags: string[];
};


const RoutesList = () => {
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const theme = useColorScheme() || "light";
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        let token = await SecureStore.getItemAsync("accessToken");
        if (!token) {
          token = await refreshAccessToken();
        }

        const response = await fetch(`${API_URL}api/auth/routes/`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch routes");
        }
        const data: RouteItem[] = await response.json();
        setRoutes(data);
        setError(null);
      } catch (error: any) {
        console.error("Error fetching routes:", error);
        setError("Could not load routes. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchRoutes();
  }, []);

  const renderRouteItem = ({ item }: { item: RouteItem }) => (
    <TouchableOpacity
      style={[styles.routeItem, { backgroundColor: Colors[theme].primary }]}
      onPress={() => {
        navigation.navigate("RouteView", { routeData: item });
      }}
    >
      <Text style={styles.routeText}>{item.title || "Unnamed Route"}</Text>
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
    <SafeAreaView style={styles.container}>
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
  container: {
    flex: 1,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
  },
  listContainer: {
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  routeItem: {
    padding: 15,
    borderRadius: 8,
    marginVertical: 10,
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
});

export default RoutesList;
