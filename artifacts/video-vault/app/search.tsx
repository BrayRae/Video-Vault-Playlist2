import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IconButton } from "@/components/IconButton";
import { usePlaylists, type Playlist, type Video } from "@/context/PlaylistsContext";
import { useColors } from "@/hooks/useColors";

type Hit = { video: Video; playlist: Playlist; index: number };

export default function SearchScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { playlists, videos } = usePlaylists();

  const [query, setQuery] = useState("");

  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top + 8;
  const bottomPad = isWeb ? 34 : insets.bottom + 16;

  const allHits = useMemo<Hit[]>(() => {
    const hits: Hit[] = [];
    playlists.forEach((p) => {
      p.videoIds.forEach((vid, i) => {
        const v = videos[vid];
        if (v) hits.push({ video: v, playlist: p, index: i });
      });
    });
    return hits;
  }, [playlists, videos]);

  const trimmed = query.trim().toLowerCase();
  const results = useMemo<Hit[]>(() => {
    if (!trimmed) return allHits;
    return allHits.filter(
      (h) =>
        h.video.name.toLowerCase().includes(trimmed) ||
        h.playlist.name.toLowerCase().includes(trimmed),
    );
  }, [allHits, trimmed]);

  const onOpenHit = (hit: Hit) => {
    router.replace({
      pathname: "/playlist/[id]/feed",
      params: { id: hit.playlist.id, index: String(hit.index) },
    });
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.header, { paddingTop: topPad }]}>
        <IconButton icon="x" onPress={() => router.back()} background="solid" />
        <View
          style={[
            styles.searchBox,
            {
              backgroundColor: colors.input,
              borderRadius: colors.radius,
            },
          ]}
        >
          <Feather name="search" size={18} color={colors.mutedForeground} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search clips and playlists"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.searchInput, { color: colors.foreground }]}
            autoFocus
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 ? (
            <Pressable onPress={() => setQuery("")} hitSlop={10}>
              <Feather name="x-circle" size={18} color={colors.mutedForeground} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <FlatList
        data={results}
        keyExtractor={(h) => `${h.playlist.id}:${h.video.id}:${h.index}`}
        contentContainerStyle={{
          paddingBottom: bottomPad + 24,
          paddingTop: 8,
        }}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <ResultRow hit={item} onPress={() => onOpenHit(item)} />
        )}
        ListEmptyComponent={
          <EmptyState
            hasQuery={trimmed.length > 0}
            totalCount={allHits.length}
          />
        }
        ListHeaderComponent={
          results.length > 0 ? (
            <Text style={[styles.countLabel, { color: colors.mutedForeground }]}>
              {results.length} {results.length === 1 ? "result" : "results"}
            </Text>
          ) : null
        }
      />
    </KeyboardAvoidingView>
  );
}

function ResultRow({ hit, onPress }: { hit: Hit; onPress: () => void }) {
  const colors = useColors();
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
          { backgroundColor: colors.cardElevated, borderRadius: 10 },
        ]}
      >
        {hit.video.thumbnailUri ? (
          <Image
            source={{ uri: hit.video.thumbnailUri }}
            style={[StyleSheet.absoluteFillObject, { borderRadius: 10 }]}
            contentFit="cover"
          />
        ) : (
          <Feather name="play" size={20} color={colors.mutedForeground} />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text
          numberOfLines={1}
          style={[styles.rowTitle, { color: colors.foreground }]}
        >
          {hit.video.name}
        </Text>
        <Text
          numberOfLines={1}
          style={[styles.rowMeta, { color: colors.mutedForeground }]}
        >
          {hit.playlist.name}
        </Text>
      </View>
      <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
    </Pressable>
  );
}

function EmptyState({
  hasQuery,
  totalCount,
}: {
  hasQuery: boolean;
  totalCount: number;
}) {
  const colors = useColors();
  return (
    <View style={styles.empty}>
      <View
        style={[
          styles.emptyIcon,
          { backgroundColor: colors.cardElevated },
        ]}
      >
        <Feather
          name={hasQuery ? "search" : "video"}
          size={26}
          color={colors.mutedForeground}
        />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
        {hasQuery
          ? "No matches"
          : totalCount === 0
            ? "Nothing to search yet"
            : "Type to search"}
      </Text>
      <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>
        {hasQuery
          ? "Try a different word or part of a clip name."
          : totalCount === 0
            ? "Add some clips first, then come back to find them by name."
            : "Search across every clip and playlist."}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingBottom: 12,
    gap: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    height: 48,
  },
  searchInput: {
    flex: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 16,
    paddingVertical: 0,
  },
  countLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 14,
  },
  thumb: {
    width: 56,
    height: 72,
    overflow: "hidden",
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
  empty: {
    paddingHorizontal: 32,
    paddingTop: 64,
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
