import React, { useState, useEffect } from "react";
import SearchPage from "./pages/SearchPage";
import {RouteItem} from "@/app/pages/RoutesList";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  useColorScheme,
} from "react-native";
import {
  createStackNavigator,
  StackScreenProps,
} from "@react-navigation/stack";
import {
  NavigationContainer,
  useNavigationState,
} from "@react-navigation/native";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import HomePage from "./pages/HomePage";
import UserPage from "./pages/UserPage";
import RoutesList from "./pages/RoutesList";
import NavigationView from "./pages/NavigationView";
import RouteView from "./pages/RouteView";
import MapboxGL from "@rnmapbox/maps";
import * as SecureStore from "expo-secure-store";
import { refreshAccessToken } from "@/utils/apiHelper";
import FetchableImage from "@/components/FetchableImage";
import { UserProvider, useUserContext } from "@/context/UserProvider";
import Footer from "@/components/HomePage/Footer";
import LogoHeader from "@/components/LogoHeader";
import Colors from "../constants/Colors";

import { mapboxToken } from "@/utils/apiHelper";
import ExplorePage from "./pages/ExplorePage";

MapboxGL.setAccessToken(mapboxToken);

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Home: {
    startLocation: { latitude: number; longitude: number } | null;
    selectedCoordinates: { latitude: number; longitude: number };
    selectedPlaceName: string;
    selectedTags?: number[];
    waypoints?: {latitude:number, longitude: number}[] | null;
  };
  User: undefined;
  Search: undefined;
  RoutesList: undefined;
  NavigationView: { waypoints: {latitude:number, longitude: number}[] };
  Explore: undefined;
  RouteView: { routeData: RouteItem };
};

const Stack = createStackNavigator<RootStackParamList>();

const App = () => {
  const theme = useColorScheme() || "light";

  const ProfilePictureHeader = ({ navigation }: { navigation: any }) => {
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const { userData } = useUserContext();

    useEffect(() => {
      const fetchAccessToken = async () => {
        try {
          let token = await SecureStore.getItemAsync("accessToken");
          if (!token) {
            token = await refreshAccessToken();
          }
          setAccessToken(token);
        } catch (error) {
          console.error("Failed to fetch access token:", error);
          setAccessToken(null);
        }
      };

      fetchAccessToken();
    }, []);

    return (
      <TouchableOpacity
        onPress={() => navigation.navigate("User")}
        style={{ paddingRight: 15 }}
      >
        <FetchableImage
          imageUrl={userData?.photo || null}
          defaultImage={require("../assets/default-user.png")}
          style={{ width: 45, height: 45, borderRadius: 25, marginBottom: 5 }}
          resizeMode="cover"
        />
      </TouchableOpacity>
    );
  };

  return (
    <UserProvider>
      <NavigationContainer>
        <StatusBar
          barStyle={theme === "dark" ? "light-content" : "dark-content"}
          backgroundColor={Colors[theme].primary}
        />
        <View style={styles.container}>
          <Stack.Navigator
            initialRouteName="Login"
            screenOptions={({ navigation, route }: StackScreenProps<RootStackParamList>) => ({
              headerStyle: {
                backgroundColor: Colors[theme].primary,
                height: 60,
              },
              headerTintColor: Colors[theme].buttonText,
              headerTitleStyle: { fontWeight: "bold" },
              headerTitle: () => (
                <LogoHeader style={{ marginLeft: 0, marginTop: 0 }} />
              ),
              headerRight: () =>
                route.name == "Home" ? (
                  <ProfilePictureHeader navigation={navigation} />
                ) : null,
            })}
          >
            <Stack.Screen
              name="Login"
              component={LoginPage}
              options={{ headerLeft: () => null }}
            />
            <Stack.Screen
              name="Register"
              component={RegisterPage}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Home"
              component={HomePage}
              options={{
                title: "Home",
                headerLeft: () => null,
                headerShown: false,
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="User"
              component={UserPage}
              options={{
                title: "User Profile",
                headerLeft: () => null,
                headerTransparent: true,
              }}
            />

            <Stack.Screen
              name="NavigationView"
              component={NavigationView}
              options={{ title: "Navigation", headerShown: false }}
            />
            <Stack.Screen
              name="Search"
              component={SearchPage}
              options={{ title: "Search",
                headerShown: false,
               }}
            />     
            <Stack.Screen
              name="Explore"
              component={ExplorePage}
              options={{title: "Explore",
                headerShown: false,
              }}
            />
            
            <Stack.Screen
            
  name="RouteView"
  component={RouteView}
  options={{ title: "Route Details" }}
/>
   
          </Stack.Navigator>
          <FooterWrapper />
        </View>
      </NavigationContainer>
    </UserProvider>
  );
};

const FooterWrapper = () => {
  const navigationState = useNavigationState((state) => state);

  if (!navigationState || !navigationState.routes) {
    return null;
  }

  const currentRoute = navigationState.routes[navigationState.index]?.name;

  if (currentRoute === "Login" || currentRoute === "Register" || currentRoute === "NavigationView") {
    return null;
  }

  return <Footer />;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
  },
});

export default App;
