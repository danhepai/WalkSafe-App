import React from "react";
import { TouchableOpacity, Text, StyleSheet, Image, View } from "react-native";
import Colors from "@/constants/Colors";

type FooterItemProps = {
  label: string;
  onPress: () => void;
  isActive?: boolean;
  theme?: "light" | "dark";
  iconSource?: any;
};

const FooterItem: React.FC<FooterItemProps> = ({
  label,
  onPress,
  theme = "light",
  isActive = false,
  iconSource,
}) => {
  return (
    <TouchableOpacity style={styles.navButton} onPress={onPress}>
      {/* Background View */}
      <View
        style={[
          styles.backgroundContainer,
          { backgroundColor: Colors[theme].primary },
          isActive && { backgroundColor: Colors[theme].primaryDark },
        ]}
      />
      {/* Foreground content */}
      <View style={styles.contentContainer}>
        <Image
          source={iconSource}
          style={[
            styles.icon,
          ]}
          resizeMode="contain"
        />
        <Text style={[styles.navButtonText, { color: Colors[theme].buttonText }]}>
          {label}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  navButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    padding:3,
  },
  backgroundContainer: {
    ...StyleSheet.absoluteFillObject, // Makes the background cover the entire button
    borderRadius: 20,
  },
  contentContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  navButtonText: {
    fontSize: 16,
    marginTop: 3,
  },
  icon: {
    marginTop: 6,
    marginBottom: -3,
    width: 24,
    height: 24,
  },
});

export default FooterItem;
