import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IconButton } from "@/components/IconButton";
import { PrimaryButton } from "@/components/PrimaryButton";
import { coverSource, PRESET_KEYS } from "@/constants/covers";
import { usePlaylists } from "@/context/PlaylistsContext";
import { useColors } from "@/hooks/useColors";

export default function CreatePlaylistScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string }>();
  const { getPlaylist, createPlaylist, updatePlaylist } = usePlaylists();

  const editing = useMemo(
    () => (params.id ? getPlaylist(String(params.id)) : undefined),
    [params.id, getPlaylist],
  );

  const [name, setName] = useState(editing?.name ?? "");
  const [cover, setCover] = useState<string>(editing?.cover ?? "preset:1");

  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top + 8;
  const bottomPad = isWeb ? 34 : insets.bottom + 16;

  const onPickCustomCover = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        "Permission needed",
        "Allow photo access to pick a custom cover.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.9,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]) {
      setCover(result.assets[0].uri);
    }
  };

  const onSave = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert("Name required", "Give your playlist a name.");
      return;
    }
    if (editing) {
      updatePlaylist(editing.id, { name: trimmed, cover });
      router.back();
    } else {
      const created = createPlaylist({ name: trimmed, cover });
      router.dismiss();
      router.push({ pathname: "/playlist/[id]", params: { id: created.id } });
    }
  };

  const isCustomCover = !cover.startsWith("preset:");

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.header, { paddingTop: topPad }]}>
        <IconButton
          icon="x"
          onPress={() => router.back()}
          background="solid"
        />
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          {editing ? "Edit Playlist" : "New Playlist"}
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: bottomPad + 100,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.previewWrap}>
          <Image
            source={coverSource(cover)}
            style={{ width: 180, height: 180, borderRadius: colors.radius }}
            contentFit="cover"
          />
        </View>

        <Text style={[styles.label, { color: colors.mutedForeground }]}>
          Playlist Name
        </Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="My Late Night Reel"
          placeholderTextColor={colors.mutedForeground}
          maxLength={48}
          style={[
            styles.input,
            {
              backgroundColor: colors.input,
              color: colors.foreground,
              borderRadius: colors.radius,
            },
          ]}
          autoFocus={!editing}
          returnKeyType="done"
          onSubmitEditing={onSave}
        />

        <Text
          style={[
            styles.label,
            { color: colors.mutedForeground, marginTop: 28 },
          ]}
        >
          Cover Art
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.coverRow}
        >
          {PRESET_KEYS.map((key) => {
            const selected = cover === key;
            return (
              <Pressable
                key={key}
                onPress={() => setCover(key)}
                style={({ pressed }) => [
                  styles.coverTile,
                  {
                    borderRadius: colors.radius,
                    borderColor: selected ? colors.primary : "transparent",
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Image
                  source={coverSource(key)}
                  style={[
                    styles.coverImg,
                    { borderRadius: colors.radius - 4 },
                  ]}
                  contentFit="cover"
                />
                {selected ? (
                  <View
                    style={[
                      styles.checkBadge,
                      { backgroundColor: colors.primary },
                    ]}
                  >
                    <Feather name="check" size={14} color="#fff" />
                  </View>
                ) : null}
              </Pressable>
            );
          })}

          <Pressable
            onPress={onPickCustomCover}
            style={({ pressed }) => [
              styles.coverTile,
              styles.uploadTile,
              {
                borderRadius: colors.radius,
                borderColor: isCustomCover ? colors.primary : colors.border,
                backgroundColor: colors.cardElevated,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            {isCustomCover ? (
              <Image
                source={coverSource(cover)}
                style={[
                  styles.coverImg,
                  { borderRadius: colors.radius - 4 },
                ]}
                contentFit="cover"
              />
            ) : (
              <View style={styles.uploadInner}>
                <Feather name="image" size={22} color={colors.foreground} />
                <Text
                  style={[
                    styles.uploadLabel,
                    { color: colors.foreground },
                  ]}
                >
                  Upload
                </Text>
              </View>
            )}
            {isCustomCover ? (
              <View
                style={[
                  styles.checkBadge,
                  { backgroundColor: colors.primary },
                ]}
              >
                <Feather name="check" size={14} color="#fff" />
              </View>
            ) : null}
          </Pressable>
        </ScrollView>
      </ScrollView>

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
        <PrimaryButton
          label={editing ? "Save Changes" : "Create Playlist"}
          onPress={onSave}
          icon={editing ? "check" : "plus"}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
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
  previewWrap: {
    alignItems: "center",
    marginVertical: 24,
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
  coverRow: {
    gap: 12,
    paddingVertical: 4,
    paddingRight: 8,
  },
  coverTile: {
    width: 96,
    height: 96,
    borderWidth: 2,
    overflow: "hidden",
    padding: 4,
    position: "relative",
  },
  coverImg: {
    width: "100%",
    height: "100%",
  },
  uploadTile: {
    alignItems: "center",
    justifyContent: "center",
  },
  uploadInner: {
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  uploadLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  checkBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
});
