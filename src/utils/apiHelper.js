import axios from "axios";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";
import { Dimensions } from "react-native";

export const API_URL = Constants.expoConfig?.extra?.API_BASE_URL || "http://192.168.50.159:8000/";

export const mapboxToken =
  Constants.expoConfig?.extra?.MAPBOX_ACCESS_TOKEN || "fallback-token";

export const { width, height } = Dimensions.get("window");

/**
 * Refresh the access token using the refresh token stored in SecureStore.
 * @returns {Promise<string>} The new access token.
 */
export const refreshAccessToken = async () => {
  try {
    const refreshToken = await SecureStore.getItemAsync("refreshToken");
    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    const response = await axios.post(`${API_URL}api/token/refresh/`, {
      refresh: refreshToken,
    });

    if (response.status === 200) {
      const { access } = response.data;
      await SecureStore.setItemAsync("accessToken", access);
      return access;
    } else {
      throw new Error("Failed to refresh access token");
    }
  } catch (error) {
    console.error("Token refresh error:", error);
    throw error;
  }
};

/**
 * Fetch data from a given URL with optional configuration options.
 * Automatically refreshes the access token if needed.
 * @param {string} url The API endpoint to fetch data from.
 * @param {object} options Additional request configuration (headers, params, etc.).
 * @returns {Promise<any>} The API response data.
 */
export const fetchData = async (url, options = {}) => {
  try {
    let accessToken = await SecureStore.getItemAsync("accessToken");
    if (!accessToken) {
      throw new Error("No access token available");
    }

    const config = {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${accessToken}`,
      },
    };

    const response = await axios(url, config);
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 401) {
      try {
        console.log("Access token expired, refreshing...");
        const newAccessToken = await refreshAccessToken();

        const config = {
          ...options,
          headers: {
            ...options.headers,
            Authorization: `Bearer ${newAccessToken}`,
          },
        };

        const response = await axios(url, config);
        return response.data;
      } catch (refreshError) {
        console.error("Failed to refresh access token:", refreshError);
        throw refreshError;
      }
    } else {
      console.error("Fetch data error:", error);
      throw error;
    }
  }
};

/**
 * Upload a file (e.g., a photo) to the server.
 * @param {string} url The API endpoint to upload the file to.
 * @param {FormData} formData The form data containing the file.
 * @returns {Promise<any>} The server response.
 */
export const uploadFile = async (url, formData) => {
  try {
    let accessToken = await SecureStore.getItemAsync("accessToken");
    if (!accessToken) {
      accessToken = await refreshAccessToken();
      if (!accessToken) {
        throw new Error("Unable to retrieve access token");
      }
    }

    const response = await axios.patch(url, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return response.data;
  } catch (error) {
    console.error("File upload error:", error);
    throw error;
  }
};

/**
 * Log out the user by removing tokens from SecureStore.
 * @returns {Promise<void>}
 */
export const logoutUser = async () => {
  try {
    await SecureStore.deleteItemAsync("accessToken");
    await SecureStore.deleteItemAsync("refreshToken");
  } catch (error) {
    console.error("Error during logout:", error);
    throw error;
  }
};
