import { Feather } from "@expo/vector-icons";
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

import { CoverImage } from "@/components/CoverImage";
import { IconButton } from "@/components/IconButton";
import { PrimaryButton } from "@/components/PrimaryButton";
import { usePlaylists, type Video } from "@/context/PlaylistsContext";
import { useColors } from "@/hooks/useColors";

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
  } = usePlaylists();

  const playlist = getPlaylist(playlistId);
  const videos = useMemo(
    () => (playlist ? getVideosForPlaylist(playlistId) : []),
    [playlist, getVideosForPlaylist, playlistId],
  );

  const isWeb = Platform.OS === "web";
  const topInset = isWeb ? 67 : insets.top;
  const bottomInset = isWeb ? 34 : insets.bottom;
  const heroHeight = Math.min(width, 480);

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

  const onDeletePlaylist = () => {
    Alert.alert(
      "Delete playlist?",
      `"${playlist.name}" will be removed. Videos used in other playlists are kept.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deletePlaylist(playlistId);
            router.replace("/");
          },
        },
      ],
    );
  };

  const onRemoveVideo = (video: Video) => {
    Alert.alert("Remove from playlist?", "This won't delete the video file.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => removeVideoFromPlaylist(playlistId, video.id),
      },
    ]);
  };

  return (
    <View style={[{ flex: 1 }, { backgroundColor: colors.background }]}>
      <FlatList
        data={videos}
        keyExtractor={(v) => v.id}
        contentContainerStyle={{
          paddingBottom: bottomInset + 32,
        }}
        ListHeaderComponent={
          <Hero
            heroHeight={heroHeight}
            topInset={topInset}
            playlistName={playlist.name}
            cover={playlist.cover}
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
            onPress={() => onPlayAll(index)}
            onRemove={() => onRemoveVideo(item)}
          />
        )}
        ListEmptyComponent={
          <EmptyVideos onAdd={onAddVideos} />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

function Hero({
  heroHeight,
  topInset,
  playlistName,
  cover,
  videoCount,
  onBack,
  onEdit,
  onDelete,
  onPlayAll,
  onAddVideos,
}: {
  heroHeight: number;
  topInset: number;
  playlistName: string;
  cover: string;
  videoCount: number;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPlayAll: () => void;
  onAddVideos: () => void;
}) {
  const colors = useColors();
  return (
    <View>
      <View style={{ height: heroHeight, position: "relative" }}>
        <CoverImage
          cover={cover}
          rounded={0}
          style={StyleSheet.absoluteFillObject}
        />
        <LinearGradient
          colors={["rgba(0,0,0,0.4)", "rgba(0,0,0,0)", colors.background]}
          locations={[0, 0.4, 1]}
          style={StyleSheet.absoluteFillObject}
        />
        <View
          style={[
            styles.heroTopBar,
            { paddingTop: topInset + 6 },
          ]}
        >
          <IconButton icon="arrow-left" onPress={onBack} />
          <View style={{ flexDirection: "row", gap: 6 }}>
            <IconButton icon="edit-2" onPress={onEdit} />
            <IconButton
              icon="trash-2"
              onPress={onDelete}
              color={colors.destructive}
            />
          </View>
        </View>
        <View style={styles.heroCaption}>
          <Text style={[styles.kicker, { color: "#fff", opacity: 0.8 }]}>
            Playlist
          </Text>
          <Text
            numberOfLines={2}
            style={[styles.heroTitle, { color: "#fff" }]}
          >
            {playlistName}
          </Text>
          <Text style={[styles.heroMeta, { color: "rgba(255,255,255,0.75)" }]}>
            {videoCount} {videoCount === 1 ? "video" : "videos"}
          </Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        <PrimaryButton
          label={videoCount === 0 ? "Add Videos" : "Play All"}
          onPress={videoCount === 0 ? onAddVideos : onPlayAll}
          icon={videoCount === 0 ? "plus" : "play"}
          style={{ flex: 1 }}
        />
        {videoCount > 0 ? (
          <Pressable
            onPress={onAddVideos}
            style={({ pressed }) => [
              styles.secondaryAction,
              {
                backgroundColor: colors.cardElevated,
                borderRadius: colors.radius,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Feather name="plus" size={20} color={colors.foreground} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function VideoRow({
  video,
  index,
  onPress,
  onRemove,
}: {
  video: Video;
  index: number;
  onPress: () => void;
  onRemove: () => void;
}) {
  const colors = useColors();
  const duration = formatDuration(video.durationMs);
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
            backgroundColor: colors.cardElevated,
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
          <Feather name="play" size={20} color={colors.mutedForeground} />
        )}
        <View style={styles.thumbOverlay}>
          <Feather name="play" size={16} color="#fff" />
        </View>
      </View>
      <View style={{ flex: 1 }}>
        <Text
          numberOfLines={1}
          style={[styles.rowTitle, { color: colors.foreground }]}
        >
          Clip {index + 1}
        </Text>
        <Text style={[styles.rowMeta, { color: colors.mutedForeground }]}>
          {duration}
        </Text>
      </View>
      <Pressable
        onPress={onRemove}
        hitSlop={10}
        style={({ pressed }) => ({
          padding: 8,
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <Feather name="more-horizontal" size={20} color={colors.mutedForeground} />
      </Pressable>
    </Pressable>
  );
}

function EmptyVideos({ onAdd }: { onAdd: () => void }) {
  const colors = useColors();
  return (
    <View style={styles.emptyVideos}>
      <View
        style={[
          styles.emptyIcon,
          { backgroundColor: colors.cardElevated },
        ]}
      >
        <Feather name="video" size={26} color={colors.mutedForeground} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
        No videos yet
      </Text>
      <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>
        Pull videos from your library to start your feed.
      </Text>
      <PrimaryButton
        label="Add Videos"
        icon="plus"
        onPress={onAdd}
        style={{ marginTop: 18 }}
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
    bottom: 24,
    left: 20,
    right: 20,
  },
  kicker: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  heroTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 36,
    letterSpacing: -1,
    lineHeight: 40,
  },
  heroMeta: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    marginTop: 8,
  },
  actionRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 18,
    gap: 10,
  },
  secondaryAction: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
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
    marginTop: 6,
    lineHeight: 20,
  },
});
