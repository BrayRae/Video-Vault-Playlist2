import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";

import { useColors } from "@/hooks/useColors";

type Props = {
  icon: keyof typeof Feather.glyphMap;
  onPress: () => void;
  size?: number;
  color?: string;
  background?: "none" | "glass" | "solid";
  style?: ViewStyle;
  testID?: string;
};

export function IconButton({
  icon,
  onPress,
  size = 22,
  color,
  background = "glass",
  style,
  testID,
}: Props) {
  const colors = useColors();
  const iconColor = color ?? colors.foreground;

  const handlePress = () => {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync().catch(() => {});
    }
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      testID={testID}
      style={({ pressed }) => [
        styles.btn,
        { opacity: pressed ? 0.7 : 1 },
        style,
      ]}
    >
      <View
        style={[
          styles.bg,
          background === "glass"
            ? { backgroundColor: "rgba(255,255,255,0.12)" }
            : background === "solid"
              ? { backgroundColor: colors.cardElevated }
              : { backgroundColor: "transparent" },
        ]}
      >
        <Feather name={icon} size={size} color={iconColor} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  bg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
});
