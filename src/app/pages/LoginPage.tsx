import React, { useEffect, useState } from "react";
import { TouchableOpacity, Alert, StyleSheet, View, ActivityIndicator, BackHandler } from "react-native";
import { ThemedText } from "../../components/ThemedComponents/ThemedText";
import { ThemedView } from "../../components/ThemedComponents/ThemedView";
import Colors from "../../constants/Colors";
import { useColorScheme } from "react-native";
import { StackScreenProps } from "@react-navigation/stack";
import App, { RootStackParamList } from "../index";

import { fetchData, refreshAccessToken } from "../../utils/apiHelper";

import axios from "axios";
import * as SecureStore from "expo-secure-store";

import ThemedTextInput from "../../components/ThemedComponents/ThemedTextInput";
import {API_URL} from "../../utils/apiHelper";

import { useUserContext } from "@/context/UserProvider";

type LoginPageProps = StackScreenProps<RootStackParamList, "Login"> & {
  mockAuthenticate?: (username: string, password: string) => Promise<boolean>;
};

const LoginPage: React.FC<LoginPageProps> = ({ navigation, mockAuthenticate }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Show loading initially
  const [isUsernameValid, setIsUsernameValid] = useState(true);
  const [isPasswordValid, setIsPasswordValid] = useState(true);
  const [backPressCount, setBackPressCount] = useState(0);
  const theme = useColorScheme() || "light";

  const {setUserData} = useUserContext();

  useEffect(() => {
    const attemptLoginWithRefreshToken = async () => {
      try {
        const refreshToken = await SecureStore.getItemAsync("refreshToken");
        if (refreshToken) {
          const isAuthenticated = await refreshAccessToken();
          if (isAuthenticated) {
            const userData = await fetchUserData();
            if (userData) {
              setUserData(userData);
              navigation.reset({
                index: 0,
                routes: [{ name: "Home" }],
              });
              return;
            }
          }
        }
      } catch (error) {
        console.error("Error during refresh token process:", error);
      }
      setIsLoading(false); // Stop loading if no refresh token found or login fails
    };

    const backAction = () => {
      if (backPressCount === 1) {
        BackHandler.exitApp();
        return true;
      }
      setBackPressCount((prevCount) => prevCount + 1);
      setTimeout(() => setBackPressCount(0), 2000);
      Alert.alert("Hold on!", "Press back again to exit the app.");
      return true;
    };

    BackHandler.addEventListener("hardwareBackPress", backAction);

    attemptLoginWithRefreshToken();

    return () => {
      BackHandler.removeEventListener("hardwareBackPress", backAction);
    };
  }, []);

  const validateInputs = () => {
    const validUsername = username.trim().length > 0;
    const validPassword = password.trim().length > 0;
    setIsUsernameValid(validUsername);
    setIsPasswordValid(validPassword);
    return validUsername && validPassword;
  };

  const handleLogin = async () => {
    if (isLoading) return;

    if (!validateInputs()) {
      setErrorMessage("Please fill in all fields.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const isAuthenticated = await (mockAuthenticate
        ? mockAuthenticate(username, password)
        : authenticate(username, password));

      if (isAuthenticated) {
        const userData = await fetchUserData();
        if (userData) {
          setUserData(userData);
          navigation.reset({
            index: 0,
            routes: [{ name: "Home" }],
          });
        } else {
          setErrorMessage("Failed to fetch user data after login.");
        }
      } else {
        setErrorMessage("Invalid username or password.");
      }
    } catch (error) {
      setErrorMessage("Something went wrong. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  const authenticate = async (username: string, password: string) => {
    try {
      const response = await axios.post(`${API_URL}api/token/`, {
        username,
        password,
      });

      if (response.status === 200) {
        const { access, refresh } = response.data;
        await SecureStore.setItemAsync("accessToken", access);
        await SecureStore.setItemAsync("refreshToken", refresh);
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error("Authentication error:", error);
      return false;
    }
  };

  const fetchUserData = async () => {
    try {
      const userData = await fetchData(`${API_URL}api/auth/user/`);
      if (userData) {
        return userData;
      }
      console.error("Failed to fetch user data.");
      return null;
    } catch (error) {
      console.error("Error fetching user data:", error);
      return null;
    }
  };

  return isLoading ? (
    <ThemedView style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={Colors[theme].primary} />
    </ThemedView>
  ) : (
    <ThemedView
      style={styles.container}
      lightColor={Colors.light.background}
      darkColor={Colors.dark.background}
    >
      <ThemedText style={styles.title} type="title">
        Login
      </ThemedText>
      {errorMessage && (
        <View style={styles.errorBox}>
          <ThemedText style={styles.errorText}>{errorMessage}</ThemedText>
        </View>
      )}
      <ThemedTextInput
        style={[styles.input, !isUsernameValid && styles.invalidInput]}
        placeholder="Username"
        placeholderTextColor={Colors[theme].text}
        onChangeText={(text) => {
          setUsername(text);
          setIsUsernameValid(true);
        }}
        value={username}
        autoCapitalize="none"
      />
      <ThemedTextInput
        style={[styles.input, !isPasswordValid && styles.invalidInput]}
        placeholder="Password"
        placeholderTextColor={Colors[theme].text}
        onChangeText={(text) => {
          setPassword(text);
          setIsPasswordValid(true);
        }}
        value={password}
        secureTextEntry
        autoCapitalize="none"
      />
      <TouchableOpacity
        style={[styles.button, { backgroundColor: isLoading ? "gray" : Colors[theme].primary }]}
        onPress={handleLogin}
        disabled={isLoading}
      >
        <ThemedText style={styles.buttonText}>
          {isLoading ? "Logging In..." : "Login"}
        </ThemedText>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate("Register")}>
        <ThemedText style={styles.linkText}>
          Don't have an account? Register
        </ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    marginBottom: 20,
    fontSize: 24,
    fontWeight: "bold",
  },
  input: {
    width: "100%",
    padding: 10,
    marginVertical: 5,
    borderWidth: 1,
    borderRadius: 5,
  },
  invalidInput: {
    borderColor: "red",
  },
  button: {
    width: "100%",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginVertical: 10,
  },
  buttonText: {
    fontWeight: "bold",
  },
  linkText: {
    marginTop: 15,
    textDecorationLine: "underline",
    color: Colors.light.primary,
  },
  errorBox: {
    marginBottom: 15,
    padding: 10,
    borderRadius: 5,
    backgroundColor: "#ffcccc",
  },
  errorText: {
    color: "red",

  },
});

export default LoginPage;
