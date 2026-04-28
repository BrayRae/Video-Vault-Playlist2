import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as SystemUI from "expo-system-ui";
import React, { useEffect } from "react";
import {
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
import { usePlaylists, type Playlist } from "@/context/PlaylistsContext";
import { useColors } from "@/hooks/useColors";

const GRID_GAP = 14;
const SIDE_PADDING = 20;

export default function LibraryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { ready, playlists, videos } = usePlaylists();
  const { width } = useWindowDimensions();

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.background).catch(() => {});
  }, [colors.background]);

  const isWeb = Platform.OS === "web";
  const tileWidth = (width - SIDE_PADDING * 2 - GRID_GAP) / 2;
  const topInset = isWeb ? 67 : insets.top;
  const bottomInset = isWeb ? 34 : insets.bottom;

  type Tile = { kind: "create" } | { kind: "playlist"; playlist: Playlist };
  const tiles: Tile[] = [
    { kind: "create" },
    ...playlists.map((p) => ({ kind: "playlist" as const, playlist: p })),
  ];

  const totalVideos = Object.keys(videos).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={tiles}
        keyExtractor={(item) =>
          item.kind === "create" ? "create" : item.playlist.id
        }
        numColumns={2}
        columnWrapperStyle={{ gap: GRID_GAP }}
        contentContainerStyle={{
          paddingHorizontal: SIDE_PADDING,
          paddingBottom: bottomInset + 32,
          gap: GRID_GAP,
        }}
        ListHeaderComponent={
          <Header
            topInset={topInset}
            playlistCount={playlists.length}
            videoCount={totalVideos}
          />
        }
        ListEmptyComponent={null}
        renderItem={({ item }) => {
          if (item.kind === "create") {
            return (
              <CreateTile
                width={tileWidth}
                onPress={() => router.push("/create")}
              />
            );
          }
          return (
            <PlaylistTile
              width={tileWidth}
              playlist={item.playlist}
              onPress={() =>
                router.push({
                  pathname: "/playlist/[id]",
                  params: { id: item.playlist.id },
                })
              }
            />
          );
        }}
        ListFooterComponent={
          ready && playlists.length === 0 ? <EmptyHint /> : null
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

function Header({
  topInset,
  playlistCount,
  videoCount,
}: {
  topInset: number;
  playlistCount: number;
  videoCount: number;
}) {
  const colors = useColors();
  return (
    <View style={{ paddingTop: topInset + 12, paddingBottom: 24 }}>
      <Text style={[styles.kicker, { color: colors.mutedForeground }]}>
        Your Vault
      </Text>
      <Text style={[styles.title, { color: colors.foreground }]}>
        Library
      </Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
        {playlistCount} {playlistCount === 1 ? "playlist" : "playlists"} ·{" "}
        {videoCount} {videoCount === 1 ? "video" : "videos"}
      </Text>
    </View>
  );
}

function CreateTile({
  width,
  onPress,
}: {
  width: number;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          width,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.createTile,
          {
            width,
            height: width,
            borderColor: colors.border,
            borderRadius: colors.radius,
          },
        ]}
      >
        <LinearGradient
          colors={[colors.gradientStart + "33", colors.gradientEnd + "33"]}
          style={[
            StyleSheet.absoluteFillObject,
            { borderRadius: colors.radius },
          ]}
        />
        <View style={styles.createIconWrap}>
          <Feather name="plus" size={28} color={colors.foreground} />
        </View>
        <Text style={[styles.tileName, { color: colors.foreground }]}>
          New Playlist
        </Text>
        <Text style={[styles.tileMeta, { color: colors.mutedForeground }]}>
          Start collecting
        </Text>
      </View>
    </Pressable>
  );
}

function PlaylistTile({
  width,
  playlist,
  onPress,
}: {
  width: number;
  playlist: Playlist;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [{ width, opacity: pressed ? 0.85 : 1 }]}
    >
      <CoverImage
        cover={playlist.cover}
        rounded={colors.radius}
        style={{ width, height: width }}
        overlay
      />
      <View style={styles.tileLabel}>
        <Text
          numberOfLines={1}
          style={[styles.tileName, { color: colors.foreground }]}
        >
          {playlist.name}
        </Text>
        <Text style={[styles.tileMeta, { color: colors.mutedForeground }]}>
          {playlist.videoIds.length}{" "}
          {playlist.videoIds.length === 1 ? "video" : "videos"}
        </Text>
      </View>
    </Pressable>
  );
}

function EmptyHint() {
  const colors = useColors();
  return (
    <View style={styles.emptyHint}>
      <Feather name="film" size={32} color={colors.mutedForeground} />
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
        Build your first vault
      </Text>
      <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>
        Tap the tile above to create a playlist, then add videos from your
        library.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  kicker: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 40,
    letterSpacing: -1.2,
  },
  subtitle: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    marginTop: 6,
  },
  createTile: {
    overflow: "hidden",
    borderWidth: 1.5,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  createIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  tileLabel: {
    paddingHorizontal: 4,
    paddingTop: 10,
  },
  tileName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  tileMeta: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 2,
  },
  emptyHint: {
    marginTop: 40,
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 24,
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
  },
});
