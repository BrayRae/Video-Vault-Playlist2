import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IconButton } from "@/components/IconButton";
import { PrimaryButton } from "@/components/PrimaryButton";
import { usePlaylists } from "@/context/PlaylistsContext";
import { useColors } from "@/hooks/useColors";

export default function RenameVideoScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { videoId } = useLocalSearchParams<{ videoId: string }>();
  const id = String(videoId);
  const { videos, renameVideo } = usePlaylists();
  const video = videos[id];

  const [name, setName] = useState(video?.name ?? "");

  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top + 8;
  const bottomPad = isWeb ? 34 : insets.bottom + 16;

  const onSave = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert("Name required", "Give this clip a name.");
      return;
    }
    renameVideo(id, trimmed);
    router.back();
  };

  if (!video) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.foreground, fontFamily: "Inter_500Medium" }}>
          Video not found
        </Text>
        <PrimaryButton
          label="Close"
          onPress={() => router.back()}
          style={{ marginTop: 16 }}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.header, { paddingTop: topPad }]}>
        <IconButton icon="x" onPress={() => router.back()} background="solid" />
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          Rename Clip
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.body}>
        <View style={styles.preview}>
          {video.thumbnailUri ? (
            <Image
              source={{ uri: video.thumbnailUri }}
              style={[
                styles.thumb,
                { borderRadius: colors.radius },
              ]}
              contentFit="cover"
            />
          ) : (
            <View
              style={[
                styles.thumb,
                {
                  borderRadius: colors.radius,
                  backgroundColor: colors.cardElevated,
                },
              ]}
            />
          )}
        </View>

        <Text style={[styles.label, { color: colors.mutedForeground }]}>
          Clip Name
        </Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Beach sunset run"
          placeholderTextColor={colors.mutedForeground}
          maxLength={80}
          style={[
            styles.input,
            {
              backgroundColor: colors.input,
              color: colors.foreground,
              borderRadius: colors.radius,
            },
          ]}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={onSave}
        />
      </View>

      <View
        style={[
          styles.footer,
          {
            paddingBottom: bottomPad,
            backgroundColor: colors.background,
            borderTopColor: colors.border,
          },
        ]}
      >
        <PrimaryButton label="Save Name" onPress={onSave} icon="check" />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 17,
  },
  body: {
    flex: 1,
    paddingHorizontal: 20,
  },
  preview: {
    alignItems: "center",
    marginVertical: 24,
  },
  thumb: {
    width: 160,
    height: 200,
  },
  label: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  input: {
    fontFamily: "Inter_500Medium",
    fontSize: 18,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
});
