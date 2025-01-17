import React from "react";
import { TouchableOpacity, Alert, StyleSheet } from "react-native";
import { launchImageLibrary, launchCamera, CameraOptions, ImageLibraryOptions, MediaType } from "react-native-image-picker";
import { ThemedText } from "../components/ThemedComponents/ThemedText";
import Colors from "@/constants/Colors";

type CaptureButtonProps = {
  onPhotoSelected: (photoUri: string) => void; // Callback when a photo is selected
  theme: "light" | "dark"; // Current theme
};

const CaptureButton: React.FC<CaptureButtonProps> = ({ onPhotoSelected, theme }) => {
  const handleSelectPhoto = () => {
    const options: ImageLibraryOptions = {
      mediaType: "photo" as MediaType,
      maxWidth: 300,
      maxHeight: 300,
      quality: 1,
    };

    launchImageLibrary(options, (response) => {
      if (response.didCancel) {
        console.log("User cancelled image picker");
      } else if (response.errorCode) {
        Alert.alert("Error", response.errorMessage || "An error occurred while selecting a photo.");
      } else if (response.assets && response.assets.length > 0) {
        const selectedAsset = response.assets[0];
        if (selectedAsset.uri) {
          onPhotoSelected(selectedAsset.uri); // Pass photo URI to parent
        }
      }
    });
  };

  const handleCapturePhoto = () => {
    const options: CameraOptions = {
      mediaType: "photo" as MediaType,
      saveToPhotos: true,
      maxWidth: 300,
      maxHeight: 300,
      quality: 1,
    };

    launchCamera(options, (response) => {
      if (response.didCancel) {
        console.log("User cancelled camera");
      } else if (response.errorCode) {
        Alert.alert("Error", response.errorMessage || "An error occurred while capturing a photo.");
      } else if (response.assets && response.assets.length > 0) {
        const capturedAsset = response.assets[0];
        if (capturedAsset.uri) {
          onPhotoSelected(capturedAsset.uri); // Pass photo URI to parent
        }
      }
    });
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: Colors[theme].primary }]}
        onPress={handleCapturePhoto}
      >
        <ThemedText style={styles.buttonText} lightColor="#FFFFFF" darkColor="#FFFFFF">
          Capture New Photo
        </ThemedText>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: Colors[theme].secondary }]}
        onPress={handleSelectPhoto}
      >
        <ThemedText style={styles.buttonText} lightColor="#FFFFFF" darkColor="#FFFFFF">
          Upload Photo
        </ThemedText>
      </TouchableOpacity>
    </>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginVertical: 5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default CaptureButton;
