import React, { useState, useEffect } from "react";
import { Image, Alert, ActivityIndicator, View } from "react-native";
import axios from "axios";
import { refreshAccessToken } from "@/utils/apiHelper";
import * as SecureStore from "expo-secure-store";

interface FetchableImageProps {
  imageUrl: string | null;
  defaultImage: any;
  style?: object;
  resizeMode?: "cover" | "contain" | "stretch" | "repeat" | "center";
}

const FetchableImage: React.FC<FetchableImageProps> = ({
  imageUrl,
  defaultImage,
  style,
  resizeMode = "cover",
}) => {
  const [imageSource, setImageSource] = useState<any>(defaultImage);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadImage = async () => {
      const token = await getAccessToken();
      if (imageUrl && token) {
        fetchImage(token);
      } else {
        setImageSource(defaultImage);
        setIsLoading(false);
      }
    };

    loadImage();
  }, [imageUrl]);

  const getAccessToken = async (): Promise<string | null> => {
    let token = await SecureStore.getItemAsync("accessToken");
    if (!token) {
      token = await refreshAccessToken();
    }
    return token;
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const fetchImage = async (token: string, retry: boolean = true) => {
    try {
      setIsLoading(true);
      const response = await axios.get(imageUrl!, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        responseType: "blob",
      });

      if (response.status === 200) {
        const base64Image = await blobToBase64(response.data);
        setImageSource({ uri: base64Image });
      } else {
        console.warn("Failed to fetch image:", response.statusText);
        setImageSource(defaultImage);
      }
    } catch (error) {
      handleFetchError(error, retry);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFetchError = async (error: unknown, retry: boolean) => {
    if (axios.isAxiosError(error) && error.response?.status === 401 && retry) {
      console.warn("Access token expired. Attempting to refresh...");
      const newToken = await refreshAccessToken();

      if (newToken) {
        fetchImage(newToken, false);
      } else {
        console.error("Failed to refresh access token.");
        Alert.alert("Error", "Session expired. Please log in again.");
        setImageSource(defaultImage);
      }
    } else {
      console.error("Error fetching image:", error);
      Alert.alert("Error", "Failed to fetch image.");
      setImageSource(defaultImage);
    }
  };

  return (
    <View>
      {isLoading ? (
        <ActivityIndicator size="small" color="#0000ff" />
      ) : (
        <Image source={imageSource} style={style} resizeMode={resizeMode} />
      )}
    </View>
  );
};

export default FetchableImage;
