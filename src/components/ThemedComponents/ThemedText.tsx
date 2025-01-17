import { Text, type TextProps, StyleSheet } from 'react-native';

import { useThemeColor } from 'hooks/useThemeColor';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');

  return (
    <Text
      style={[
        { color },
        type === 'default' ? styles.default : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'link' ? styles.link : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: 16,
    lineHeight: 24,
  },
  defaultSemiBold: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  },
  title: {
    fontSize: 28, // Slightly smaller for better scaling
    fontWeight: '700', // Bolder weight for emphasis
    lineHeight: 36, // Increased line height for better readability
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '600', // Slightly less bold than title
    lineHeight: 28, // Good spacing for subtitles
  },
  link: {
    fontSize: 16,
    lineHeight: 24,
    color: '#1A73E8', // Updated color for a modern blue link color
    textDecorationLine: 'underline', // Adds underline to emphasize link
  },
});
