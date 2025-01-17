import React from "react";
import { View, TouchableOpacity, Text, StyleSheet, useColorScheme } from "react-native";
import { useNavigation, useNavigationState } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../../app/";
import Colors from "@/constants/Colors";
import FooterItem from "./FooterItem";

type NavigationProp = StackNavigationProp<RootStackParamList>;

const Footer: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const theme = useColorScheme() || "light";
  const currentRoute = useNavigationState((state) => state.routes[state.index].name);

  return (
    <View style={[styles.footer, {backgroundColor: Colors[theme].primary}]}>
      <FooterItem label="Home" onPress={() => navigation.navigate("Home")} theme={theme} isActive = {currentRoute === "Home" || currentRoute === "Search"} iconSource={require('../../assets/icons/home-icon.png')}/>
      <FooterItem label="Explore" onPress={() => navigation.navigate("Explore")} theme={theme} isActive = {currentRoute === "Explore"} iconSource={require('../../assets/icons/explore-icon.png')} />
      <FooterItem label="Profile" onPress={() => navigation.navigate("User")} theme={theme} isActive = {currentRoute === "User"} iconSource={require('../../assets/icons/user.png')} />
    </View>
  );
};

const styles = StyleSheet.create({
  footer: {
    position: "absolute",
    bottom: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    padding: 10,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,

  },
  footerButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
  },
});

export default Footer;
