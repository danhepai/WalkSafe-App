import React from "react";
import { TouchableOpacity, Image, StyleSheet, ImageStyle } from "react-native";
import { useNavigation, NavigationProp, useNavigationState } from "@react-navigation/native";
import { RootStackParamList } from "../app/index";

type LogoHeaderProps = {
  style?: ImageStyle; 
};

const LogoHeader: React.FC<LogoHeaderProps> = ({ style }) => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const currentRoute = useNavigationState((state) => state.routes[state.index].name);

  const handlePress = () => {
    if (currentRoute !== "Login" && currentRoute !== "Register") {
      navigation.navigate("Home");
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={styles.logoHeaderContainer}
    >
      <Image source={require("../assets/logo.png")} style={[styles.logoImage, style]} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  logoHeaderContainer: {},
  logoImage: {
    resizeMode: "contain",
    height: 50,
    aspectRatio: 1,
  },
});

export default LogoHeader;
