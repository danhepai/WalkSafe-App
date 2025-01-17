import React, { useEffect, useState } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Text,
  Modal,
  Alert,
  TouchableWithoutFeedback,
  useColorScheme,
} from "react-native";
import { useUserContext } from "@/context/UserProvider";
import * as SecureStore from "expo-secure-store";
import { API_URL, refreshAccessToken, uploadFile } from "@/utils/apiHelper";
import FetchableImage from "@/components/FetchableImage";
import { launchImageLibrary, launchCamera, ImageLibraryOptions, CameraOptions, MediaType } from 'react-native-image-picker';
import Colors from "@/constants/Colors";

const ProfilePictureHeader = ({ navigation }: { navigation: any }) => {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const { userData, setUserData } = useUserContext();
  const [modalVisible, setModalVisible] = useState(false);
  const theme = useColorScheme() || 'light';

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


  const handleSelectPhoto = async () => {
    const options: ImageLibraryOptions = {
      mediaType: "photo" as MediaType,
      maxWidth: 3000,
      maxHeight: 3000,
      quality: 1,
    };

    launchImageLibrary(options, async (response) => {
      if (response.didCancel) return;
      if (response.errorCode) {
        Alert.alert("Error", response.errorMessage || "An error occurred.");
        return;
      }
      if (response.assets && response.assets.length > 0 && response.assets[0].uri) {
        await uploadPhotoToServer(response.assets[0].uri);
        setModalVisible(false);
      }
    });
  };

  const handleCapturePhoto = async () => {

    const options: CameraOptions = {
      mediaType: "photo" as MediaType,
      saveToPhotos: true,
      maxWidth: 3000,
      maxHeight: 3000,
      quality: 1,
    };

    launchCamera(options, async (response) => {
      if (response.didCancel) return;
      if (response.errorCode) {
        Alert.alert("Error", response.errorMessage || "An error occurred.");
        return;
      }
      if (response.assets && response.assets.length > 0 && response.assets[0].uri) {
        await uploadPhotoToServer(response.assets[0].uri);
        setModalVisible(false);
      }
    });
  };

  const uploadPhotoToServer = async (photoUri: string) => {
    if (!photoUri) return;
    const formData = new FormData();
    const photoName = photoUri.split("/").pop() || "profile.jpg";
    formData.append("photo", {
      uri: photoUri,
      name: photoName,
      type: "image/jpeg",
    } as any);

    try {
      const response = await uploadFile(`${API_URL}api/auth/user/`, formData);
      Alert.alert("Success", "Photo uploaded successfully!");
      setUserData({ ...userData, photo: response.photo });
    } catch (error) {
      console.error("Upload error:", error);
      Alert.alert("Error", "An error occurred.");
    }
  };

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync("accessToken");
    await SecureStore.deleteItemAsync("refreshToken");
    setUserData(null);
    Alert.alert("Success", "Logged out.");
    navigation.navigate("Login");
  };

  const handleChangePassword = () => {
    navigation.navigate("ChangePassword");
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          onPress: async () => {
            try {
              const response = await fetch(`${API_URL}api/auth/user/`, {
                method: "DELETE", 
                headers: { Authorization: `Bearer ${accessToken}` },
              });
              if (response.ok) {
                await SecureStore.deleteItemAsync("accessToken");
                setUserData(null);
                Alert.alert("Success", "Account deleted.");
                navigation.navigate("Login");
              } else {
                Alert.alert("Error", "Failed to delete account.");
              }
            } catch (error) {
              console.error("Delete Account Error:", error);
              Alert.alert("Error", "An error occurred.");
            }
          },
        },
      ],
      { cancelable: false }
    );
  };

  return (
    <>
      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        style={styles.profilePictureContainer}
      >
        <FetchableImage
          imageUrl={userData?.photo || null}
          defaultImage={require("@/assets/default-user.png")}
          accessToken={accessToken}
          style={styles.profilePicture}
          resizeMode="cover"
        />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={[styles.modalContent,{backgroundColor: Colors[theme].background}]}>
                <Text style={[styles.modalTitle, {color:Colors[theme].text}]}>Settings</Text>
                <TouchableOpacity style={styles.modalButton} onPress={handleSelectPhoto}>
                  <Text style={styles.buttonText}>Select from Gallery</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalButton} onPress={handleCapturePhoto}>
                  <Text style={styles.buttonText}>Capture a Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalButton} onPress={handleChangePassword}>
                  <Text style={styles.buttonText}>Change Password</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalButton} onPress={handleDeleteAccount}>
                  <Text style={styles.buttonText}>Delete Account</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalButton} onPress={handleLogout}>
                  <Text style={styles.buttonText}>Logout</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  profilePictureContainer: {
    marginLeft: 10,
    width: 35,
    height: 35,
    borderRadius: 17.5,
    overflow: "hidden",
  },
  profilePicture: {
    width: "100%",
    height: "100%",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    padding: 40,
    borderRadius: 10,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 30,
  },
  modalButton: {
    width: 150,
    paddingVertical: 10,
    margin: 5,
    borderRadius: 5,
    backgroundColor: Colors.light.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    textAlign: "center",
    color: Colors.light.buttonText,
  },
  cancelButton: {
    backgroundColor: Colors.light.secondary,
  },
});

export default ProfilePictureHeader;
