import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";

import { coverSource } from "@/constants/covers";
import { useColors } from "@/hooks/useColors";

type Props = {
  cover: string;
  style?: ViewStyle;
  rounded?: number;
  overlay?: boolean;
};

export function CoverImage({ cover, style, rounded = 16, overlay = false }: Props) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.wrap,
        { borderRadius: rounded, backgroundColor: colors.cardElevated },
        style,
      ]}
    >
      <Image
        source={coverSource(cover)}
        style={StyleSheet.absoluteFillObject}
        contentFit="cover"
        transition={200}
      />
      {overlay ? (
        <LinearGradient
          colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.85)"]}
          style={StyleSheet.absoluteFillObject}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: "hidden",
  },
});
