import React, { useState, useEffect } from "react";
import { TouchableOpacity, StyleSheet } from "react-native";
import FetchableImage from "@/components/FetchableImage";
import { useUserContext } from "@/context/UserProvider";
import * as SecureStore from "expo-secure-store";
import { refreshAccessToken } from "@/utils/apiHelper";

const ProfilePictureHeader: React.FC<{ navigation: any }> = ({ navigation }) => {
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
      style={styles.profilePictureContainer}
    >
      <FetchableImage
        imageUrl={userData?.photo || null}
        defaultImage={require("../assets/default-user.png")}
        accessToken={accessToken}
        style={styles.profilePicture}
        resizeMode="cover"
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  profilePictureContainer: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    overflow: "hidden",
  },
  profilePicture: {
    width: "100%",
    height: "100%",
  },
});

export default ProfilePictureHeader;
