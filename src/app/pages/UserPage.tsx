import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  TouchableOpacity,
  View,
  Modal,
  TouchableWithoutFeedback,
  FlatList,
  Dimensions,
} from "react-native";
import { useColorScheme } from "react-native";
import { ThemedText } from "../../components/ThemedComponents/ThemedText";
import { ThemedView } from "../../components/ThemedComponents/ThemedView";
import Colors from "@/constants/Colors";
import { useUserContext } from "@/context/UserProvider";
import { refreshAccessToken } from "@/utils/apiHelper";
import FetchableImage from "../../components/FetchableImage";
import * as SecureStore from "expo-secure-store";
import TabLink from "@/components/TabLink";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

type UserPageProps = {
  navigation: any;
};

const UserPage: React.FC<UserPageProps> = ({ navigation }) => {
  const { userData } = useUserContext();
  const theme = useColorScheme() || "light";
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [enlargedPhotoUri, setEnlargedPhotoUri] = useState<string | null>(null);

  const tabs = ["Statistics", "MyRoutes", "Achievements"];
  const flatListRef = useRef<FlatList>(null);


  useEffect(() => {
    const fetchAccessToken = async () => {
      try {
        let token = await SecureStore.getItemAsync("accessToken");
        if (!token) {
          token = await refreshAccessToken();
        }
        setAccessToken(token);
      } catch (error) {
        console.error("Error fetching access token:", error);
      }
    };

    fetchAccessToken();
  }, []);

  const handleTabPress = (index: number) => {
    setActiveTabIndex(index);
    flatListRef.current?.scrollToOffset({ offset: width * index, animated: true });
  };

  const handlePhotoPress = () => {
    setEnlargedPhotoUri(userData?.photo || null);
    setIsModalVisible(true);
  };

  const renderTabContent = (index: number) => (
    <ThemedView style={styles.tabContent}>
      <ThemedText style={styles.centeredTabTitle}>{tabs[index]}</ThemedText>
      {index === 0 && (
        <>
          <ThemedText>Total Routes: {userData?.statistics?.routes || 0}</ThemedText>
          <ThemedText>Upvotes: {userData?.statistics?.upvotes || 0}</ThemedText>
          <ThemedText>Downvotes: {userData?.statistics?.downvotes || 0}</ThemedText>
        </>
      )}
      {index === 1 && (
        <>
          {userData?.routes && userData.routes.length > 0 ? (
            userData.routes.map((route, i) => (
              <ThemedText key={i}>
                {route.name} ({route.isPublic ? "Public" : "Private"})
              </ThemedText>
            ))
          ) : (
            <ThemedText>No routes available</ThemedText>
          )}
        </>
      )}
      {index === 2 && (
        <>
          {userData?.achievements && userData.achievements.length > 0 ? (
            userData.achievements.map((achievement, i) => (
              <View key={i} style={styles.achievementContainer}>
                <ThemedText>{achievement.name}</ThemedText>
                <View style={styles.starsContainer}>
                  {[...Array(3)].map((_, starIndex) => (
                    <View
                      key={starIndex}
                      style={[
                        styles.star,
                        {
                          backgroundColor:
                            starIndex < achievement.currentStars
                              ? Colors[theme].primary
                              : "#ccc",
                        },
                      ]}
                    />
                  ))}
                </View>
                <ThemedText>Progress: {achievement.currentStars}/3</ThemedText>
              </View>
            ))
          ) : (
            <ThemedText>No achievements available</ThemedText>
          )}
        </>
      )}
    </ThemedView>
  );

  return (    
    <ThemedView style={styles.container}>
      <SafeAreaView>
        <View style={styles.userInfo}>
          <TouchableOpacity onPress={handlePhotoPress}>
            <FetchableImage
              imageUrl={userData?.photo || null}
              defaultImage={require("../../assets/default-user.png")}
              style={styles.userImage}
              resizeMode="cover"
            />
          </TouchableOpacity>
          <ThemedText style={styles.title} type="title">
            Hi, {userData?.username}
          </ThemedText>
        </View>
      </SafeAreaView>

      {/* Modal for Enlarging Photo */}
      <Modal visible={isModalVisible} transparent={true} animationType="fade">
        <TouchableWithoutFeedback onPress={() => setIsModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                  <FetchableImage
                    imageUrl={userData?.photo || null}
                    defaultImage={require("../../assets/default-user.png")}
                    style={styles.modalImage}
                    resizeMode="contain"
                  />
              </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Tab Buttons using TabLink */}
      <TabLink tabs={tabs} activeTabIndex={activeTabIndex} onTabPress={handleTabPress} />

      {/* FlatList for Tab Content */}
      <FlatList
        horizontal
        pagingEnabled
        data={tabs}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ width: width * tabs.length }}
        keyExtractor={(item) => item}
        renderItem={({ index }) => <View style={{ width }}>{renderTabContent(index)}</View>}
        ref={flatListRef}
        onMomentumScrollEnd={(event) => {
          const index = Math.round(event.nativeEvent.contentOffset.x / width);
          setActiveTabIndex(index);
        }}
      />
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  userInfo: {
    marginBottom: 20,
    alignItems: "center",
    paddingTop: 20,
  },
  userImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
  },
  tabContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  centeredTabTitle: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
  },
  achievementContainer: {
    marginBottom: 20,
    alignItems: "center",
  },
  starsContainer: {
    flexDirection: "row",
    marginVertical: 10,
  },
  star: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginHorizontal: 5,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    
  },
  modalContent: {
    backgroundColor: "transparent",
  },
  modalImage: {
    height: "85%",
    aspectRatio: 1,
  },
  enlargedImage: {
    width: 500,
    height: 500,
  },
});

export default UserPage;
