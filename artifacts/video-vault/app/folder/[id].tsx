import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
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
import { useConfirm } from "@/context/ConfirmContext";
import { usePlaylists, type Playlist } from "@/context/PlaylistsContext";
import { useColors } from "@/hooks/useColors";

const GRID_GAP = 14;
const SIDE_PADDING = 20;

export default function FolderDetailScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const folderId = String(id);
  const { width } = useWindowDimensions();
  const {
    playlists,
    getFolder,
    getPlaylistsForFolder,
    deleteFolder,
    addPlaylistsToFolder,
    removePlaylistFromFolder,
  } = usePlaylists();
  const confirm = useConfirm();

  const folder = getFolder(folderId);
  const folderPlaylists = useMemo(
    () => (folder ? getPlaylistsForFolder(folderId) : []),
    [folder, getPlaylistsForFolder, folderId],
  );

  const [pickerOpen, setPickerOpen] = useState(false);

  const isWeb = Platform.OS === "web";
  const topInset = isWeb ? 67 : insets.top;
  const bottomInset = isWeb ? 34 : insets.bottom;
  const heroHeight = Math.min(width * 0.85, 360);
  const tileWidth = (width - SIDE_PADDING * 2 - GRID_GAP) / 2;

  if (!folder) {
    return (
      <View
        style={[
          styles.center,
          { backgroundColor: colors.background, paddingTop: topInset + 80 },
        ]}
      >
        <Feather name="folder" size={36} color={colors.mutedForeground} />
        <Text style={[styles.missing, { color: colors.foreground }]}>
          Folder not found
        </Text>
        <PrimaryButton
          label="Back to Library"
          icon="arrow-left"
          onPress={() => router.replace("/")}
          style={{ marginTop: 16 }}
        />
      </View>
    );
  }

  const onEdit = () => {
    router.push({ pathname: "/folder/edit", params: { id: folderId } });
  };

  const onDelete = async () => {
    const ok = await confirm({
      title: "Delete this folder?",
      message: `"${folder.name}" will be removed. The playlists inside will stay in your vault.`,
      confirmLabel: "Yes, Delete",
      destructive: true,
    });
    if (ok) {
      deleteFolder(folderId);
      router.replace("/");
    }
  };

  const onRemovePlaylist = async (pl: Playlist) => {
    const ok = await confirm({
      title: "Remove from this folder?",
      message: `"${pl.name}" will stay in your vault, just outside this folder.`,
      confirmLabel: "Yes, Remove",
      destructive: true,
    });
    if (ok) removePlaylistFromFolder(folderId, pl.id);
  };

  const availableToAdd = playlists.filter(
    (p) => !folder.playlistIds.includes(p.id),
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={folderPlaylists}
        keyExtractor={(p) => p.id}
        numColumns={2}
        columnWrapperStyle={{ gap: GRID_GAP, paddingHorizontal: SIDE_PADDING }}
        contentContainerStyle={{
          paddingBottom: bottomInset + 40,
          gap: GRID_GAP,
        }}
        ListHeaderComponent={
          <FolderHero
            heroHeight={heroHeight}
            topInset={topInset}
            folderName={folder.name}
            cover={folder.cover}
            playlistCount={folderPlaylists.length}
            onBack={() => router.back()}
            onEdit={onEdit}
            onDelete={onDelete}
            onAdd={() => setPickerOpen(true)}
          />
        }
        renderItem={({ item }) => (
          <FolderPlaylistTile
            width={tileWidth}
            playlist={item}
            onPress={() =>
              router.push({
                pathname: "/playlist/[id]",
                params: { id: item.id },
              })
            }
            onRemove={() => onRemovePlaylist(item)}
          />
        )}
        ListEmptyComponent={
          <EmptyFolder
            onAdd={() => setPickerOpen(true)}
            hasAvailable={availableToAdd.length > 0}
            onCreate={() => router.push("/create")}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      <PlaylistPicker
        visible={pickerOpen}
        playlists={availableToAdd}
        onClose={() => setPickerOpen(false)}
        onConfirm={(ids) => {
          addPlaylistsToFolder(folderId, ids);
          setPickerOpen(false);
        }}
        onCreateNew={() => {
          setPickerOpen(false);
          router.push("/create");
        }}
      />
    </View>
  );
}

function FolderHero({
  heroHeight,
  topInset,
  folderName,
  cover,
  playlistCount,
  onBack,
  onEdit,
  onDelete,
  onAdd,
}: {
  heroHeight: number;
  topInset: number;
  folderName: string;
  cover: string;
  playlistCount: number;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAdd: () => void;
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
        <View style={[styles.heroTopBar, { paddingTop: topInset + 6 }]}>
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
          <View style={styles.kickerRow}>
            <Feather name="folder" size={12} color="#fff" />
            <Text style={[styles.kicker, { color: "#fff", opacity: 0.8 }]}>
              Folder
            </Text>
          </View>
          <Text numberOfLines={2} style={[styles.heroTitle, { color: "#fff" }]}>
            {folderName}
          </Text>
          <Text style={[styles.heroMeta, { color: "rgba(255,255,255,0.75)" }]}>
            {playlistCount} {playlistCount === 1 ? "playlist" : "playlists"}
          </Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        <PrimaryButton
          label="Add Playlists"
          onPress={onAdd}
          icon="plus"
          style={{ flex: 1 }}
        />
      </View>
    </View>
  );
}

function FolderPlaylistTile({
  width,
  playlist,
  onPress,
  onRemove,
}: {
  width: number;
  playlist: Playlist;
  onPress: () => void;
  onRemove: () => void;
}) {
  const colors = useColors();
  return (
    <View style={{ width }}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
      >
        <CoverImage
          cover={playlist.cover}
          rounded={colors.radius}
          style={{ width, height: width }}
          overlay
        />
      </Pressable>
      <View style={styles.tileFooter}>
        <View style={{ flex: 1 }}>
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
        <Pressable
          onPress={onRemove}
          hitSlop={10}
          style={({ pressed }) => ({
            padding: 6,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Feather name="x" size={18} color={colors.mutedForeground} />
        </Pressable>
      </View>
    </View>
  );
}

function EmptyFolder({
  onAdd,
  hasAvailable,
  onCreate,
}: {
  onAdd: () => void;
  hasAvailable: boolean;
  onCreate: () => void;
}) {
  const colors = useColors();
  return (
    <View style={styles.emptyWrap}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.cardElevated }]}>
        <Feather name="folder" size={26} color={colors.mutedForeground} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
        This folder is empty
      </Text>
      <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>
        {hasAvailable
          ? "Add a few playlists to keep them grouped together."
          : "Create a playlist first, then add it to this folder."}
      </Text>
      <PrimaryButton
        label={hasAvailable ? "Add Playlists" : "Create Playlist"}
        icon={hasAvailable ? "plus" : "plus-circle"}
        onPress={hasAvailable ? onAdd : onCreate}
        style={{ marginTop: 18 }}
      />
    </View>
  );
}

function PlaylistPicker({
  visible,
  playlists,
  onClose,
  onConfirm,
  onCreateNew,
}: {
  visible: boolean;
  playlists: Playlist[];
  onClose: () => void;
  onConfirm: (ids: string[]) => void;
  onCreateNew: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  React.useEffect(() => {
    if (!visible) setSelected(new Set());
  }, [visible]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top + 8;
  const bottomPad = isWeb ? 34 : insets.bottom + 16;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={[styles.pickerHeader, { paddingTop: topPad }]}>
          <IconButton icon="x" onPress={onClose} background="solid" />
          <Text style={[styles.pickerTitle, { color: colors.foreground }]}>
            Add Playlists
          </Text>
          <View style={{ width: 44 }} />
        </View>

        {playlists.length === 0 ? (
          <View style={styles.pickerEmpty}>
            <Feather name="list" size={32} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              Nothing left to add
            </Text>
            <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>
              Every playlist in your vault is already in this folder.
            </Text>
            <PrimaryButton
              label="Create New Playlist"
              icon="plus"
              onPress={onCreateNew}
              style={{ marginTop: 18 }}
            />
          </View>
        ) : (
          <FlatList
            data={playlists}
            keyExtractor={(p) => p.id}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingBottom: bottomPad + 100,
              paddingTop: 8,
            }}
            renderItem={({ item }) => {
              const isSel = selected.has(item.id);
              return (
                <Pressable
                  onPress={() => toggle(item.id)}
                  style={({ pressed }) => [
                    styles.pickerRow,
                    {
                      backgroundColor: isSel
                        ? colors.cardElevated
                        : "transparent",
                      borderRadius: colors.radius,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <CoverImage
                    cover={item.cover}
                    rounded={10}
                    style={{ width: 56, height: 56 }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      numberOfLines={1}
                      style={[styles.pickerName, { color: colors.foreground }]}
                    >
                      {item.name}
                    </Text>
                    <Text
                      style={[
                        styles.pickerMeta,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      {item.videoIds.length}{" "}
                      {item.videoIds.length === 1 ? "video" : "videos"}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.checkCircle,
                      {
                        borderColor: isSel ? colors.primary : colors.border,
                        backgroundColor: isSel
                          ? colors.primary
                          : "transparent",
                      },
                    ]}
                  >
                    {isSel ? (
                      <Feather name="check" size={14} color="#fff" />
                    ) : null}
                  </View>
                </Pressable>
              );
            }}
            showsVerticalScrollIndicator={false}
          />
        )}

        {playlists.length > 0 ? (
          <View
            style={[
              styles.pickerFooter,
              {
                paddingBottom: bottomPad,
                backgroundColor: colors.background,
                borderTopColor: colors.border,
              },
            ]}
          >
            <PrimaryButton
              label={
                selected.size === 0
                  ? "Select Playlists"
                  : `Add ${selected.size} ${
                      selected.size === 1 ? "Playlist" : "Playlists"
                    }`
              }
              icon="check"
              onPress={() => onConfirm(Array.from(selected))}
              disabled={selected.size === 0}
            />
          </View>
        ) : null}
      </View>
    </Modal>
  );
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
  kickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  kicker: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    letterSpacing: 1.6,
    textTransform: "uppercase",
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
  tileFooter: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    paddingTop: 10,
    gap: 6,
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
  emptyWrap: {
    marginTop: 8,
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
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
  pickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  pickerTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 17,
  },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    gap: 14,
    marginBottom: 6,
  },
  pickerName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  pickerMeta: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 2,
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  pickerFooter: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  pickerEmpty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 24,
  },
});
