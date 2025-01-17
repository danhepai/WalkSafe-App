import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { useColorScheme } from "react-native";
import { ThemedText } from "@/components/ThemedComponents/ThemedText";
import Colors from "@/constants/Colors";

type TabLinkProps = {
  tabs: string[];
  activeTabIndex: number;
  onTabPress: (index: number) => void;
};

const TabLink: React.FC<TabLinkProps> = ({ tabs, activeTabIndex, onTabPress }) => {
  const theme = useColorScheme() || "light";

  return (
    <View style={styles.tabsContainer}>
      {tabs.map((tab, index) => (
        <TouchableOpacity
          key={index}
          style={[
            styles.tabButton,
            {
                borderColor: Colors[theme].searchBarBorder,
            },
            activeTabIndex === index && { backgroundColor: Colors[theme].primary },
          ]}
          onPress={() => onTabPress(index)}
        >
          <ThemedText style={[
              styles.tabButtonText,
            {
              color: Colors[theme].text,
            }
          ]
          }>{tab}</ThemedText>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  tabsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center", 
    marginBottom: 10,
    paddingHorizontal: 10,
    
  },
  tabButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginHorizontal: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  tabButtonText: {
    fontSize: 14,
  },
});

export default TabLink;
