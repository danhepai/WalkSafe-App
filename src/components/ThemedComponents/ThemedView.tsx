import React from 'react';
import { View, type ViewProps } from 'react-native';
import Colors from '../../constants/Colors'; // Adjust path as necessary
import { useColorScheme } from 'react-native';

type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
};

export function ThemedView({ style, lightColor, darkColor, ...otherProps }: ThemedViewProps) {
  const theme = useColorScheme()|| 'light';
  const backgroundColor = lightColor && darkColor 
    ? theme === 'dark' ? darkColor : lightColor
    : Colors[theme]?.background; // Default to Colors based on theme

  return <View style={[{ backgroundColor }, style]} {...otherProps} />;
}
