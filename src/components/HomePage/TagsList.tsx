import React from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import Colors from "@/constants/Colors";

type Tag = {
  id: number;
  name: string;
};

type TagsListProps = {
  tags: Tag[];
  theme: "light" | "dark";
};

const TagsList: React.FC<TagsListProps> = ({ tags, theme }) => {
  const renderTag = ({ item }: { item: Tag }) => (
    <TouchableOpacity
      key={item.id.toString()}
      style={[styles.tag, { backgroundColor: Colors[theme].primary }]}
    >
      <Text style={styles.tagText}>{item.name}</Text>
    </TouchableOpacity>
  );

  return (
    <FlatList
      data={tags}
      renderItem={renderTag}
      keyExtractor={(item) => item.id.toString()}
      horizontal
      contentContainerStyle={styles.tagsContainer}
      showsHorizontalScrollIndicator={false}
    />
  );
};

const styles = StyleSheet.create({
  tagsContainer: {
    marginTop: 10,
    marginHorizontal: 5,
    borderRadius: 20,
  },
  tag: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 5,
  },
  tagText: {
    fontSize: 14,
    color: "white",
  },
});

export default TagsList;
