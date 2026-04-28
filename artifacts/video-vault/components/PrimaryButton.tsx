import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";

import { useColors } from "@/hooks/useColors";

type Props = {
  label: string;
  onPress: () => void;
  icon?: keyof typeof Feather.glyphMap;
  variant?: "gradient" | "solid" | "outline";
  disabled?: boolean;
  style?: ViewStyle;
  testID?: string;
};

export function PrimaryButton({
  label,
  onPress,
  icon,
  variant = "gradient",
  disabled,
  style,
  testID,
}: Props) {
  const colors = useColors();

  const handlePress = () => {
    if (disabled) return;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    onPress();
  };

  const inner = (
    <View style={styles.inner}>
      {icon ? (
        <Feather name={icon} size={18} color={colors.primaryForeground} />
      ) : null}
      <Text style={[styles.label, { color: colors.primaryForeground }]}>
        {label}
      </Text>
    </View>
  );

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      testID={testID}
      style={({ pressed }) => [
        styles.button,
        { borderRadius: colors.radius, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {variant === "gradient" ? (
        <LinearGradient
          colors={[colors.gradientStart, colors.gradientMid, colors.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFillObject, { borderRadius: colors.radius }]}
        />
      ) : variant === "solid" ? (
        <View
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: colors.primary, borderRadius: colors.radius },
          ]}
        />
      ) : (
        <View
          style={[
            StyleSheet.absoluteFillObject,
            {
              borderRadius: colors.radius,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: "transparent",
            },
          ]}
        />
      )}
      {inner}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    overflow: "hidden",
    minHeight: 52,
    paddingHorizontal: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  label: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    letterSpacing: 0.2,
  },
});
