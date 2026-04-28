import type { ImageSourcePropType } from "react-native";

export const PRESET_COVERS: Record<string, ImageSourcePropType> = {
  "preset:1": require("@/assets/images/cover-1.png"),
  "preset:2": require("@/assets/images/cover-2.png"),
  "preset:3": require("@/assets/images/cover-3.png"),
  "preset:4": require("@/assets/images/cover-4.png"),
};

export const PRESET_KEYS = ["preset:1", "preset:2", "preset:3", "preset:4"] as const;

export function coverSource(cover: string): ImageSourcePropType {
  if (cover.startsWith("preset:") && PRESET_COVERS[cover]) {
    return PRESET_COVERS[cover];
  }
  return { uri: cover };
}
