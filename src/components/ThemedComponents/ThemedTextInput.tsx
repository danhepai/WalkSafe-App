import React from "react";
import { TextInputProps, TextInput, StyleSheet, StyleProp, TextStyle } from "react-native";
import Colors from "../../constants/Colors";
import { useColorScheme } from "react-native";

type ThemedTextInputProps = TextInputProps & {
  style?: StyleProp<TextStyle>; // Add support for style prop
};

const ThemedTextInput: React.FC<ThemedTextInputProps> = ({
  style,
  placeholder,
  placeholderTextColor,
  onChangeText,
  value,
  keyboardType = "default",
  secureTextEntry = false,
  autoCapitalize = "none",
  ...props // Spread other TextInput props
}) => {
  const theme = useColorScheme() || "light";

  return (
    <TextInput
      style={[
        styles.input,
        style, // Allow overriding default styles
        {
          backgroundColor: Colors[theme].inputBackground,
          borderColor: Colors[theme].border,
          color: Colors[theme].text, // Set the text color based on the theme
        },
      ]}
      placeholder={placeholder}
      placeholderTextColor={placeholderTextColor}
      onChangeText={onChangeText}
      value={value}
      keyboardType={keyboardType}
      secureTextEntry={secureTextEntry}
      autoCapitalize={autoCapitalize}
      {...props} // Pass other props to the TextInput
    />
  );
};

const styles = StyleSheet.create({
  input: {
    width: "100%",
    padding: 15,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 15,
    textAlign: "center",
  },
});

export default ThemedTextInput;
