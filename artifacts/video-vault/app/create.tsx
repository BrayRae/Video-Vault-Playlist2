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

import { BannerMedia } from "@/components/BannerMedia";
import { ColorPicker } from "@/components/ColorPicker";
import { IconButton } from "@/components/IconButton";
import { PrimaryButton } from "@/components/PrimaryButton";
import { coverSource, PRESET_KEYS } from "@/constants/covers";
import {
  usePlaylists,
  type PlaylistBanner,
  type PlaylistTheme,
} from "@/context/PlaylistsContext";
import { useColors } from "@/hooks/useColors";

const DEFAULT_THEME = {
  background: "#0F0B1E",
  foreground: "#F4EFFF",
  accent: "#EC4899",
  accentText: "#FFFFFF",
};

type ThemeKey = keyof typeof DEFAULT_THEME;

const THEME_FIELDS: { key: ThemeKey; label: string; help: string }[] = [
  { key: "background", label: "Background", help: "Page color" },
  { key: "foreground", label: "Text", help: "Title and body text" },
  { key: "accent", label: "Buttons", help: "Play All button color" },
  { key: "accentText", label: "Button Text", help: "Text on the button" },
];

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
  const [bio, setBio] = useState<string>(editing?.bio ?? "");
  const [banner, setBanner] = useState<PlaylistBanner | null>(
    editing?.banner ?? null,
  );
  const [theme, setTheme] = useState<PlaylistTheme>({
    background: editing?.theme?.background ?? DEFAULT_THEME.background,
    foreground: editing?.theme?.foreground ?? DEFAULT_THEME.foreground,
    accent: editing?.theme?.accent ?? DEFAULT_THEME.accent,
    accentText: editing?.theme?.accentText ?? DEFAULT_THEME.accentText,
  });

  const [pickerOpen, setPickerOpen] = useState<ThemeKey | null>(null);

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

  const onPickBanner = async (kind: "image" | "video") => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        "Permission needed",
        "Allow library access to pick a banner.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: kind === "image" ? ["images"] : ["videos"],
      quality: 0.9,
      videoMaxDuration: 60,
    });
    if (!result.canceled && result.assets[0]) {
      setBanner({ kind, uri: result.assets[0].uri });
    }
  };

  const onSave = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert("Name required", "Give your playlist a name.");
      return;
    }
    const cleanBio = bio.trim();
    if (editing) {
      updatePlaylist(editing.id, {
        name: trimmed,
        cover,
        bio: cleanBio,
        banner,
        theme,
      });
      router.back();
    } else {
      const created = createPlaylist({ name: trimmed, cover });
      updatePlaylist(created.id, {
        bio: cleanBio,
        banner,
        theme,
      });
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

        {/* BANNER */}
        <Text
          style={[
            styles.label,
            { color: colors.mutedForeground, marginTop: 28 },
          ]}
        >
          Banner
        </Text>
        <View
          style={[
            styles.bannerPreview,
            {
              borderColor: colors.border,
              borderRadius: colors.radius,
              backgroundColor: colors.cardElevated,
            },
          ]}
        >
          {banner ? (
            <BannerMedia
              banner={banner}
              style={StyleSheet.absoluteFillObject}
              rounded={colors.radius}
            />
          ) : (
            <View style={styles.bannerEmpty}>
              <Feather
                name="image"
                size={28}
                color={colors.mutedForeground}
              />
              <Text
                style={[
                  styles.bannerEmptyText,
                  { color: colors.mutedForeground },
                ]}
              >
                No banner — pick an image or video below
              </Text>
            </View>
          )}
          {banner ? (
            <Pressable
              onPress={() => setBanner(null)}
              style={[
                styles.bannerClear,
                { backgroundColor: "rgba(0,0,0,0.6)" },
              ]}
            >
              <Feather name="x" size={16} color="#fff" />
            </Pressable>
          ) : null}
        </View>
        <View style={styles.bannerActions}>
          <Pressable
            onPress={() => onPickBanner("image")}
            style={({ pressed }) => [
              styles.bannerBtn,
              {
                backgroundColor: colors.cardElevated,
                borderColor: colors.border,
                borderRadius: colors.radius,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Feather name="image" size={16} color={colors.foreground} />
            <Text
              style={[styles.bannerBtnLabel, { color: colors.foreground }]}
            >
              Pick Image
            </Text>
          </Pressable>
          <Pressable
            onPress={() => onPickBanner("video")}
            style={({ pressed }) => [
              styles.bannerBtn,
              {
                backgroundColor: colors.cardElevated,
                borderColor: colors.border,
                borderRadius: colors.radius,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Feather name="film" size={16} color={colors.foreground} />
            <Text
              style={[styles.bannerBtnLabel, { color: colors.foreground }]}
            >
              Pick Video
            </Text>
          </Pressable>
        </View>

        {/* BIO */}
        <Text
          style={[
            styles.label,
            { color: colors.mutedForeground, marginTop: 28 },
          ]}
        >
          Bio / Description
        </Text>
        <TextInput
          value={bio}
          onChangeText={setBio}
          placeholder="What's this playlist all about?"
          placeholderTextColor={colors.mutedForeground}
          maxLength={500}
          multiline
          style={[
            styles.input,
            styles.bioInput,
            {
              backgroundColor: colors.input,
              color: colors.foreground,
              borderRadius: colors.radius,
            },
          ]}
        />
        <Text
          style={[styles.helpText, { color: colors.mutedForeground }]}
        >
          {bio.length}/500
        </Text>

        {/* THEME */}
        <Text
          style={[
            styles.label,
            { color: colors.mutedForeground, marginTop: 28 },
          ]}
        >
          Theme Colors
        </Text>
        <View style={styles.themeGrid}>
          {THEME_FIELDS.map((field) => {
            const value = theme[field.key] ?? DEFAULT_THEME[field.key];
            return (
              <Pressable
                key={field.key}
                onPress={() => setPickerOpen(field.key)}
                style={({ pressed }) => [
                  styles.themeRow,
                  {
                    backgroundColor: colors.cardElevated,
                    borderColor: colors.border,
                    borderRadius: colors.radius,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <View
                  style={[
                    styles.themeSwatch,
                    {
                      backgroundColor: value,
                      borderColor: "rgba(255,255,255,0.18)",
                    },
                  ]}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={[styles.themeLabel, { color: colors.foreground }]}
                  >
                    {field.label}
                  </Text>
                  <Text
                    style={[
                      styles.themeHelp,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    {field.help}
                  </Text>
                </View>
                <Text
                  style={[styles.themeHex, { color: colors.mutedForeground }]}
                >
                  {value.toUpperCase()}
                </Text>
                <Feather
                  name="chevron-right"
                  size={18}
                  color={colors.mutedForeground}
                />
              </Pressable>
            );
          })}
          <Pressable
            onPress={() => setTheme({ ...DEFAULT_THEME })}
            style={({ pressed }) => [
              styles.themeReset,
              { opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <Feather name="rotate-ccw" size={14} color={colors.mutedForeground} />
            <Text
              style={[styles.themeResetText, { color: colors.mutedForeground }]}
            >
              Reset to default theme
            </Text>
          </Pressable>
        </View>
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

      {pickerOpen ? (
        <ColorPicker
          visible
          initialHex={theme[pickerOpen] ?? DEFAULT_THEME[pickerOpen]}
          title={`Pick ${THEME_FIELDS.find((f) => f.key === pickerOpen)?.label} Color`}
          onClose={() => setPickerOpen(null)}
          onConfirm={(hex) => {
            setTheme((t) => ({ ...t, [pickerOpen]: hex }));
            setPickerOpen(null);
          }}
        />
      ) : null}
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
  bioInput: {
    minHeight: 110,
    textAlignVertical: "top",
    fontSize: 15,
    lineHeight: 22,
  },
  helpText: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    marginTop: 6,
    textAlign: "right",
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
  bannerPreview: {
    height: 140,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    position: "relative",
  },
  bannerEmpty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  bannerEmptyText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  bannerClear: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  bannerActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  bannerBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  bannerBtnLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  themeGrid: {
    gap: 8,
  },
  themeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  themeSwatch: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
  },
  themeLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  themeHelp: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    marginTop: 2,
  },
  themeHex: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    marginRight: 4,
    letterSpacing: 0.4,
  },
  themeReset: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 8,
    padding: 8,
  },
  themeResetText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
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
