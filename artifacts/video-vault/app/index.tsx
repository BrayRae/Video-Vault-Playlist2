import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as SystemUI from "expo-system-ui";
import React, { useEffect } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CoverImage } from "@/components/CoverImage";
import { IconButton } from "@/components/IconButton";
import { useConfirm } from "@/context/ConfirmContext";
import {
  usePlaylists,
  type Folder,
  type Playlist,
} from "@/context/PlaylistsContext";
import { useColors } from "@/hooks/useColors";

const GRID_GAP = 14;
const SIDE_PADDING = 20;
const FOLDER_TILE_WIDTH = 132;

export default function LibraryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { ready, playlists, folders, videos, deletePlaylist, deleteFolder } =
    usePlaylists();
  const confirm = useConfirm();
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

  const onDeleteFolder = async (folder: Folder) => {
    const ok = await confirm({
      title: "Are you sure you want to delete this folder?",
      message: `"${folder.name}" will be removed. The playlists inside will stay in your vault.`,
      confirmLabel: "Yes, Delete",
      destructive: true,
    });
    if (ok) deleteFolder(folder.id);
  };

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
          <View>
            <Header
              topInset={topInset}
              playlistCount={playlists.length}
              folderCount={folders.length}
              videoCount={totalVideos}
              onSearch={() => router.push("/search")}
            />
            <FoldersSection
              folders={folders}
              onCreate={() => router.push("/folder/edit")}
              onOpen={(f) =>
                router.push({ pathname: "/folder/[id]", params: { id: f.id } })
              }
              onDelete={onDeleteFolder}
            />
            <Text
              style={[
                styles.sectionLabel,
                { color: colors.mutedForeground },
              ]}
            >
              Playlists
            </Text>
          </View>
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
              onLongPress={async () => {
                const ok = await confirm({
                  title: "Are you sure you want to delete this playlist?",
                  message: `"${item.playlist.name}" will be removed from your vault.`,
                  confirmLabel: "Yes, Delete",
                  destructive: true,
                });
                if (ok) deletePlaylist(item.playlist.id);
              }}
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
  folderCount,
  videoCount,
  onSearch,
}: {
  topInset: number;
  playlistCount: number;
  folderCount: number;
  videoCount: number;
  onSearch: () => void;
}) {
  const colors = useColors();
  return (
    <View style={{ paddingTop: topInset + 12, paddingBottom: 18 }}>
      <View style={styles.headerTopRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.kicker, { color: colors.mutedForeground }]}>
            Your Vault
          </Text>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Library
          </Text>
        </View>
        <IconButton icon="search" onPress={onSearch} background="solid" />
      </View>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
        {folderCount} {folderCount === 1 ? "folder" : "folders"} ·{" "}
        {playlistCount} {playlistCount === 1 ? "playlist" : "playlists"} ·{" "}
        {videoCount} {videoCount === 1 ? "video" : "videos"}
      </Text>
    </View>
  );
}

function FoldersSection({
  folders,
  onCreate,
  onOpen,
  onDelete,
}: {
  folders: Folder[];
  onCreate: () => void;
  onOpen: (f: Folder) => void;
  onDelete: (f: Folder) => void;
}) {
  const colors = useColors();
  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
        Folders
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.folderRow}
      >
        <CreateFolderTile width={FOLDER_TILE_WIDTH} onPress={onCreate} />
        {folders.map((folder) => (
          <FolderTile
            key={folder.id}
            width={FOLDER_TILE_WIDTH}
            folder={folder}
            onPress={() => onOpen(folder)}
            onLongPress={() => onDelete(folder)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function CreateFolderTile({
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
      style={({ pressed }) => [{ width, opacity: pressed ? 0.85 : 1 }]}
    >
      <View
        style={[
          styles.createFolder,
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
        <View style={styles.createFolderIcon}>
          <Feather name="folder-plus" size={24} color={colors.foreground} />
        </View>
        <Text style={[styles.folderName, { color: colors.foreground }]}>
          New Folder
        </Text>
      </View>
    </Pressable>
  );
}

function FolderTile({
  width,
  folder,
  onPress,
  onLongPress,
}: {
  width: number;
  folder: Folder;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350}
      style={({ pressed }) => [{ width, opacity: pressed ? 0.85 : 1 }]}
    >
      <View style={{ width, height: width, position: "relative" }}>
        <CoverImage
          cover={folder.cover}
          rounded={colors.radius}
          style={{ width, height: width }}
          overlay
        />
        <View style={styles.folderBadge}>
          <Feather name="folder" size={12} color="#fff" />
        </View>
      </View>
      <Text
        numberOfLines={1}
        style={[styles.folderName, { color: colors.foreground, marginTop: 8 }]}
      >
        {folder.name}
      </Text>
      <Text style={[styles.folderMeta, { color: colors.mutedForeground }]}>
        {folder.playlistIds.length}{" "}
        {folder.playlistIds.length === 1 ? "playlist" : "playlists"}
      </Text>
    </Pressable>
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
  onLongPress,
}: {
  width: number;
  playlist: Playlist;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350}
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
  headerTopRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
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
  sectionLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginTop: 12,
    marginBottom: 12,
  },
  folderRow: {
    gap: 12,
    paddingRight: 20,
    paddingVertical: 4,
  },
  createFolder: {
    overflow: "hidden",
    borderWidth: 1.5,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
  },
  createFolderIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  folderBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  folderName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  folderMeta: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 2,
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
