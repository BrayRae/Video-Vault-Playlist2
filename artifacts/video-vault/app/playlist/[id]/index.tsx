import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo } from "react";
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BannerMedia } from "@/components/BannerMedia";
import { CoverImage } from "@/components/CoverImage";
import { IconButton } from "@/components/IconButton";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useConfirm } from "@/context/ConfirmContext";
import {
  usePlaylists,
  type Playlist,
  type Video,
} from "@/context/PlaylistsContext";
import { useColors } from "@/hooks/useColors";

const DEFAULT_THEME = {
  background: "#0F0B1E",
  foreground: "#F4EFFF",
  accent: "#EC4899",
  accentText: "#FFFFFF",
};

function resolveTheme(playlist: Playlist) {
  return {
    background: playlist.theme?.background ?? DEFAULT_THEME.background,
    foreground: playlist.theme?.foreground ?? DEFAULT_THEME.foreground,
    accent: playlist.theme?.accent ?? DEFAULT_THEME.accent,
    accentText: playlist.theme?.accentText ?? DEFAULT_THEME.accentText,
  };
}

function withAlpha(hex: string, alpha: number) {
  const h = hex.replace("#", "");
  if (h.length !== 6) return hex;
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, "0");
  return `#${h}${a}`;
}

export default function PlaylistDetailScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const playlistId = String(id);
  const { width } = useWindowDimensions();
  const {
    getPlaylist,
    getVideosForPlaylist,
    addVideosToPlaylist,
    deletePlaylist,
    removeVideoFromPlaylist,
    deleteVideo,
  } = usePlaylists();
  const confirm = useConfirm();

  const playlist = getPlaylist(playlistId);
  const videos = useMemo(
    () => (playlist ? getVideosForPlaylist(playlistId) : []),
    [playlist, getVideosForPlaylist, playlistId],
  );

  const isWeb = Platform.OS === "web";
  const topInset = isWeb ? 67 : insets.top;
  const bottomInset = isWeb ? 34 : insets.bottom;
  const bannerHeight = Math.min(width * 0.55, 280);

  if (!playlist) {
    return (
      <View
        style={[
          styles.center,
          { backgroundColor: colors.background, paddingTop: topInset + 60 },
        ]}
      >
        <Feather name="alert-circle" size={28} color={colors.mutedForeground} />
        <Text style={[styles.missing, { color: colors.foreground }]}>
          Playlist not found
        </Text>
        <PrimaryButton
          label="Back to Library"
          onPress={() => router.replace("/")}
          icon="arrow-left"
          style={{ marginTop: 16 }}
        />
      </View>
    );
  }

  const theme = resolveTheme(playlist);

  const onAddVideos = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        "Permission needed",
        "Allow photo access to import videos from your library.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["videos"],
      allowsMultipleSelection: true,
      selectionLimit: 10,
      videoQuality: 1,
    });
    if (!result.canceled && result.assets.length > 0) {
      await addVideosToPlaylist(
        playlistId,
        result.assets.map((a) => ({
          uri: a.uri,
          durationMs: a.duration ?? undefined,
        })),
      );
    }
  };

  const onPlayAll = (startIndex = 0) => {
    if (videos.length === 0) {
      onAddVideos();
      return;
    }
    router.push({
      pathname: "/playlist/[id]/feed",
      params: { id: playlistId, index: String(startIndex) },
    });
  };

  const onDeletePlaylist = async () => {
    const ok = await confirm({
      title: "Delete this playlist?",
      message: `"${playlist.name}" will be removed. Videos used in other playlists are kept.`,
      confirmLabel: "Yes, Delete",
      destructive: true,
    });
    if (ok) {
      deletePlaylist(playlistId);
      router.replace("/");
    }
  };

  const onRemoveVideo = async (video: Video) => {
    const ok = await confirm({
      title: "Remove from this playlist?",
      message: `"${video.name}" will stay in your vault and in any other playlists it belongs to.`,
      confirmLabel: "Yes, Remove",
      destructive: true,
    });
    if (ok) removeVideoFromPlaylist(playlistId, video.id);
  };

  const onDeleteVideo = async (video: Video) => {
    const ok = await confirm({
      title: "Are you sure you want to delete this video?",
      message: `"${video.name}" will be removed from every playlist in your vault.`,
      confirmLabel: "Yes, Delete",
      destructive: true,
    });
    if (ok) deleteVideo(video.id);
  };

  const onRenameVideo = (video: Video) => {
    router.push({
      pathname: "/video/[videoId]",
      params: { videoId: video.id },
    });
  };

  return (
    <View style={[{ flex: 1 }, { backgroundColor: theme.background }]}>
      <FlatList
        data={videos}
        keyExtractor={(v) => v.id}
        contentContainerStyle={{
          paddingBottom: bottomInset + 32,
        }}
        ListHeaderComponent={
          <Hero
            playlist={playlist}
            theme={theme}
            bannerHeight={bannerHeight}
            topInset={topInset}
            videoCount={videos.length}
            onBack={() => router.back()}
            onEdit={() =>
              router.push({
                pathname: "/create",
                params: { id: playlistId },
              })
            }
            onDelete={onDeletePlaylist}
            onPlayAll={() => onPlayAll(0)}
            onAddVideos={onAddVideos}
          />
        }
        renderItem={({ item, index }) => (
          <VideoRow
            video={item}
            index={index}
            theme={theme}
            onPress={() => onPlayAll(index)}
            onRename={() => onRenameVideo(item)}
            onRemove={() => onRemoveVideo(item)}
            onDelete={() => onDeleteVideo(item)}
          />
        )}
        ListEmptyComponent={
          <EmptyVideos onAdd={onAddVideos} theme={theme} />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

type Theme = ReturnType<typeof resolveTheme>;

function Hero({
  playlist,
  theme,
  bannerHeight,
  topInset,
  videoCount,
  onBack,
  onEdit,
  onDelete,
  onPlayAll,
  onAddVideos,
}: {
  playlist: Playlist;
  theme: Theme;
  bannerHeight: number;
  topInset: number;
  videoCount: number;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPlayAll: () => void;
  onAddVideos: () => void;
}) {
  const colors = useColors();
  const bio = playlist.bio?.trim();

  return (
    <View>
      {/* Banner */}
      <View style={{ height: bannerHeight, position: "relative" }}>
        <BannerMedia
          banner={playlist.banner ?? null}
          fallbackCover={playlist.cover}
          style={StyleSheet.absoluteFillObject}
        />
        <LinearGradient
          colors={[
            withAlpha(theme.background, 0.0),
            withAlpha(theme.background, 0.4),
            withAlpha(theme.background, 1.0),
          ]}
          locations={[0, 0.55, 1]}
          style={StyleSheet.absoluteFillObject}
        />
        <View
          style={[
            styles.heroTopBar,
            { paddingTop: topInset + 6 },
          ]}
        >
          <IconButton
            icon="arrow-left"
            onPress={onBack}
            color={theme.foreground}
          />
          <View style={{ flexDirection: "row", gap: 6 }}>
            <IconButton
              icon="edit-2"
              onPress={onEdit}
              color={theme.foreground}
            />
            <IconButton
              icon="trash-2"
              onPress={onDelete}
              color={colors.destructive}
            />
          </View>
        </View>
        <View style={styles.heroCaption}>
          <Text
            style={[styles.kicker, { color: withAlpha(theme.foreground, 0.7) }]}
          >
            Playlist
          </Text>
          <Text
            numberOfLines={2}
            style={[styles.heroTitle, { color: theme.foreground }]}
          >
            {playlist.name}
          </Text>
        </View>
      </View>

      {/* Split row: cover + play all on left, bio on right */}
      <View style={styles.splitRow}>
        <View style={styles.leftCol}>
          <CoverImage
            cover={playlist.cover}
            style={styles.coverThumb}
            rounded={colors.radius}
          />
          <Text
            style={[styles.metaUnderCover, { color: withAlpha(theme.foreground, 0.7) }]}
          >
            {videoCount} {videoCount === 1 ? "video" : "videos"}
          </Text>
          <ThemedActionButton
            label={videoCount === 0 ? "Add Videos" : "Play All"}
            icon={videoCount === 0 ? "plus" : "play"}
            onPress={videoCount === 0 ? onAddVideos : onPlayAll}
            theme={theme}
          />
          {videoCount > 0 ? (
            <Pressable
              onPress={onAddVideos}
              style={({ pressed }) => [
                styles.secondaryAddBtn,
                {
                  borderColor: withAlpha(theme.foreground, 0.18),
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Feather name="plus" size={14} color={theme.foreground} />
              <Text
                style={[
                  styles.secondaryAddText,
                  { color: theme.foreground },
                ]}
              >
                Add Videos
              </Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.rightCol}>
          <Text
            style={[
              styles.bioLabel,
              { color: withAlpha(theme.foreground, 0.55) },
            ]}
          >
            About
          </Text>
          {bio ? (
            <Text
              style={[styles.bioText, { color: theme.foreground }]}
            >
              {bio}
            </Text>
          ) : (
            <Pressable
              onPress={onEdit}
              style={({ pressed }) => [
                styles.bioEmpty,
                {
                  borderColor: withAlpha(theme.foreground, 0.18),
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Feather
                name="edit-3"
                size={14}
                color={withAlpha(theme.foreground, 0.6)}
              />
              <Text
                style={[
                  styles.bioEmptyText,
                  { color: withAlpha(theme.foreground, 0.6) },
                ]}
              >
                Tap to add a bio for this playlist
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      {videoCount > 0 ? (
        <Text
          style={[
            styles.sectionLabel,
            { color: withAlpha(theme.foreground, 0.55) },
          ]}
        >
          Videos
        </Text>
      ) : null}
    </View>
  );
}

function ThemedActionButton({
  label,
  icon,
  onPress,
  theme,
}: {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  onPress: () => void;
  theme: Theme;
}) {
  const handlePress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    onPress();
  };
  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.themedBtn,
        {
          backgroundColor: theme.accent,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <Feather name={icon} size={18} color={theme.accentText} />
      <Text style={[styles.themedBtnLabel, { color: theme.accentText }]}>
        {label}
      </Text>
    </Pressable>
  );
}

function VideoRow({
  video,
  index,
  theme,
  onPress,
  onRename,
  onRemove,
  onDelete,
}: {
  video: Video;
  index: number;
  theme: Theme;
  onPress: () => void;
  onRename: () => void;
  onRemove: () => void;
  onDelete: () => void;
}) {
  const colors = useColors();
  const duration = formatDuration(video.durationMs);
  const muted = withAlpha(theme.foreground, 0.6);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <View
        style={[
          styles.thumb,
          {
            backgroundColor: withAlpha(theme.foreground, 0.08),
            borderRadius: 10,
          },
        ]}
      >
        {video.thumbnailUri ? (
          <Image
            source={{ uri: video.thumbnailUri }}
            style={[StyleSheet.absoluteFillObject, { borderRadius: 10 }]}
            contentFit="cover"
          />
        ) : (
          <Feather name="play" size={20} color={muted} />
        )}
        <View style={styles.thumbOverlay}>
          <Feather name="play" size={16} color="#fff" />
        </View>
        <View style={[styles.indexBadge, { backgroundColor: "rgba(0,0,0,0.6)" }]}>
          <Text style={styles.indexBadgeText}>{index + 1}</Text>
        </View>
      </View>
      <View style={{ flex: 1 }}>
        <Text
          numberOfLines={1}
          style={[styles.rowTitle, { color: theme.foreground }]}
        >
          {video.name}
        </Text>
        <Text style={[styles.rowMeta, { color: muted }]}>
          {duration}
        </Text>
      </View>
      <Pressable
        onPress={onRename}
        hitSlop={10}
        style={({ pressed }) => ({
          padding: 8,
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <Feather name="edit-2" size={16} color={muted} />
      </Pressable>
      <Pressable
        onPress={onRemove}
        hitSlop={10}
        style={({ pressed }) => ({
          padding: 8,
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <Feather name="x" size={18} color={muted} />
      </Pressable>
      <Pressable
        onPress={onDelete}
        hitSlop={10}
        style={({ pressed }) => ({
          padding: 8,
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <Feather name="trash-2" size={18} color={colors.destructive} />
      </Pressable>
    </Pressable>
  );
}

function EmptyVideos({ onAdd, theme }: { onAdd: () => void; theme: Theme }) {
  return (
    <View style={styles.emptyVideos}>
      <View
        style={[
          styles.emptyIcon,
          { backgroundColor: withAlpha(theme.foreground, 0.08) },
        ]}
      >
        <Feather
          name="video"
          size={26}
          color={withAlpha(theme.foreground, 0.6)}
        />
      </View>
      <Text style={[styles.emptyTitle, { color: theme.foreground }]}>
        No videos yet
      </Text>
      <Text
        style={[
          styles.emptyBody,
          { color: withAlpha(theme.foreground, 0.6) },
        ]}
      >
        Pull videos from your library to start your feed.
      </Text>
      <ThemedActionButton
        label="Add Videos"
        icon="plus"
        onPress={onAdd}
        theme={theme}
      />
    </View>
  );
}

function formatDuration(ms?: number) {
  if (!ms || ms <= 0) return "Video";
  const totalSeconds = Math.round(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 24,
  },
  missing: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    marginTop: 12,
  },
  heroTopBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  heroCaption: {
    position: "absolute",
    bottom: 16,
    left: 20,
    right: 20,
  },
  kicker: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  heroTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 30,
    letterSpacing: -1,
    lineHeight: 34,
  },
  splitRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 18,
    gap: 16,
  },
  leftCol: {
    width: 144,
    alignItems: "stretch",
  },
  coverThumb: {
    width: 144,
    height: 144,
  },
  metaUnderCover: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginTop: 10,
    marginBottom: 8,
  },
  themedBtn: {
    minHeight: 46,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 14,
  },
  themedBtnLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    letterSpacing: 0.2,
  },
  secondaryAddBtn: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
  },
  secondaryAddText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  rightCol: {
    flex: 1,
  },
  bioLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  bioText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 20,
  },
  bioEmpty: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 14,
  },
  bioEmptyText: {
    flex: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    lineHeight: 18,
  },
  sectionLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    paddingHorizontal: 20,
    marginTop: 4,
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 14,
  },
  thumb: {
    width: 64,
    height: 80,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  thumbOverlay: {
    position: "absolute",
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  indexBadge: {
    position: "absolute",
    top: 4,
    left: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    minWidth: 20,
    alignItems: "center",
  },
  indexBadgeText: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
  },
  rowTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  rowMeta: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    marginTop: 2,
  },
  emptyVideos: {
    paddingHorizontal: 32,
    paddingVertical: 36,
    alignItems: "center",
    gap: 8,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
  },
  emptyBody: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 8,
  },
});
