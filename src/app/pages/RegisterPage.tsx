import React, { useState } from "react";
import { TouchableOpacity, Alert, StyleSheet, View } from "react-native";
import { ThemedText } from "../../components/ThemedComponents/ThemedText";
import { ThemedView } from "../../components/ThemedComponents/ThemedView";
import Colors from "../../constants/Colors";
import { useColorScheme } from "react-native";
import { StackScreenProps } from "@react-navigation/stack";
import { RootStackParamList } from "../index";

import axios from "axios";
import ThemedTextInput from "../../components/ThemedComponents/ThemedTextInput";
import { API_URL } from "@/utils/apiHelper";

type RegisterPageProps = StackScreenProps<RootStackParamList, "Register">;

const RegisterPage: React.FC<RegisterPageProps> = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const theme = useColorScheme() || "light";

  const handleRegister = async () => {
    // Reset errors
    setEmailError(null);
    setUsernameError(null);
    setPasswordError(null);

    let hasError = false;

    if (!email) {
      setEmailError("Email is required");
      hasError = true;
    }

    if (!username) {
      setUsernameError("Username is required");
      hasError = true;
    }

    if (!password) {
      setPasswordError("Password is required");
      hasError = true;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRegex.test(email)) {
      setEmailError("Please enter a valid email address");
      hasError = true;
    }

    if (hasError) {
      return;
    }

    try {
      const response = await axios.post(
        `${API_URL}api/register/`,
        {
          email,
          username,
          password,
        },
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.status === 201) {
        Alert.alert("Success", "Registration successful! Please login.");
        navigation.navigate("Login");
      } else {
        setEmailError("Something went wrong. Please try again.");
      }
    } catch (error: any) {
      console.error("Registration error:", error);
      if (error.response && error.response.data) {
        const errorData = error.response.data;
        if (errorData.email) {
          setEmailError(errorData.email.join(", "));
        }
        if (errorData.username) {
          setUsernameError(errorData.username.join(", "));
        }
        if (errorData.password) {
          setPasswordError(errorData.password.join(", "));
        }
      } else {
        setEmailError("Something went wrong. Please try again later.");
      }
    }
  };

  return (
    <ThemedView style={styles.container} lightColor={Colors.light.background} darkColor={Colors.dark.background}>
      <ThemedText style={styles.title} type="title" lightColor={Colors.light.text} darkColor={Colors.dark.text}>
        Register
      </ThemedText>
      <View style={styles.inputContainer}>
        <ThemedTextInput
          placeholder="Email"
          placeholderTextColor={Colors[theme].text}
          onChangeText={setEmail}
          value={email}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        {emailError && (
          <ThemedText style={styles.errorText} lightColor={Colors.light.error} darkColor={Colors.dark.error}>
            {emailError}
          </ThemedText>
        )}
      </View>
      <View style={styles.inputContainer}>
        <ThemedTextInput
          placeholder="Username"
          placeholderTextColor={Colors[theme].text}
          onChangeText={setUsername}
          value={username}
          autoCapitalize="none"
        />
        {usernameError && (
          <ThemedText style={styles.errorText} lightColor={Colors.light.error} darkColor={Colors.dark.error}>
            {usernameError}
          </ThemedText>
        )}
      </View>
      <View style={styles.inputContainer}>
        <ThemedTextInput
          placeholder="Password"
          placeholderTextColor={Colors[theme].text}
          onChangeText={setPassword}
          value={password}
          secureTextEntry
          autoCapitalize="none"
        />
        {passwordError && (
          <ThemedText style={styles.errorText} lightColor={Colors.light.error} darkColor={Colors.dark.error}>
            {passwordError}
          </ThemedText>
        )}
      </View>
      <TouchableOpacity style={[styles.button, { backgroundColor: Colors[theme].primary }]} onPress={handleRegister}>
        <ThemedText style={styles.buttonText} type="default" lightColor={Colors.light.buttonText} darkColor={Colors.dark.buttonText}>
          Register
        </ThemedText>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate("Login")}>
        <ThemedText style={styles.linkText} lightColor={Colors.light.primary} darkColor={Colors.dark.primary}>
          Already have an account? Login
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
  title: {
    marginBottom: 20,
    fontSize: 24,
  },
  inputContainer: {
    width: "100%",
    marginBottom: 10,
  },
  errorText: {
    marginTop: 5,
    color: Colors.light.error,
  },
  button: {
    width: "100%",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    fontWeight: "bold",
  },
  linkText: {
    marginTop: 15,
    textDecorationLine: "underline",
  },
});

export default RegisterPage;
