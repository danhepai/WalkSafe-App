import React, { useState, useEffect, useRef } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import Colors from "@/constants/Colors";
import { useColorScheme } from "react-native";
import LogoHeader from "@/components/LogoHeader";
import ProfilePictureSettings from "@/components/HomePage/ProfilePictureSettings";

const SearchBar: React.FC<{ navigation: any}> = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const textInputRef = useRef<TextInput>(null);
  const theme = useColorScheme() || "light";

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      textInputRef.current?.blur();
      setSearchQuery("");
    });
    return unsubscribe;
  }, [navigation]);

  const handleFocus = () => {
    navigation.navigate("Search", { initialQuery: searchQuery });
    textInputRef.current?.blur();
  };

  const handleChangeText = (text: string) => {
    setSearchQuery(text);
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.container}>
        <View style={styles.overlay} pointerEvents="box-none">
          <LogoHeader style={styles.logo} />
          <ProfilePictureSettings navigation={navigation} />
        </View>

        <TextInput
          ref={textInputRef}
          style={[styles.input, // Static styles from StyleSheet
            { 
              backgroundColor: Colors[theme].searchBarBackground, // Dynamic background color
              color: Colors[theme].text, // Dynamic text color
              borderColor: Colors[theme].searchBarBorder, // Dynamic border color
            }]}
          placeholder="Search for a location..."
          placeholderTextColor={Colors[theme].text}
          value={searchQuery}
          onChangeText={handleChangeText}
          onFocus={handleFocus}
        />
      </View>
    </TouchableWithoutFeedback>
  );
};


const styles = StyleSheet.create({
  container: {
    width: "100%",
    position: "relative",
    backgroundColor: "transparent",
  },
  overlay: {
    position: "absolute",
    top: 5,
    left: 15,
    right: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    height: 40,
    zIndex: 1,
    pointerEvents: "box-none",
  },
  logo: {
    padding: 5,
    width: 40,
    height: 40,
  },
  input: {
    width: "100%",
    height: 50,
    paddingHorizontal: 15,
    paddingLeft: 60,
    paddingRight: 60,
    borderWidth: 1,
    borderRadius: 25,
  },
});

export default SearchBar;
