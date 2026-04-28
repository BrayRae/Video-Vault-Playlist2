import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  Dimensions,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewToken,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IconButton } from "@/components/IconButton";
import { usePlaylists, type Video } from "@/context/PlaylistsContext";
import { useColors } from "@/hooks/useColors";

export default function FeedScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string; index?: string }>();
  const playlistId = String(params.id);
  const initialIndex = Math.max(0, parseInt(String(params.index ?? "0"), 10) || 0);

  const { getPlaylist, getVideosForPlaylist, removeVideoFromPlaylist } =
    usePlaylists();
  const playlist = getPlaylist(playlistId);
  const videos = useMemo(
    () => (playlist ? getVideosForPlaylist(playlistId) : []),
    [playlist, getVideosForPlaylist, playlistId],
  );

  const screen = Dimensions.get("window");
  const itemHeight = screen.height;

  const [activeIndex, setActiveIndex] = useState(
    Math.min(initialIndex, Math.max(0, videos.length - 1)),
  );
  const [muted, setMuted] = useState(false);

  const listRef = useRef<FlatList<Video>>(null);
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 70 }).current;

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems[0];
      if (first && typeof first.index === "number") {
        setActiveIndex(first.index);
        if (Platform.OS !== "web") {
          Haptics.selectionAsync().catch(() => {});
        }
      }
    },
  ).current;

  const viewabilityPairs = useRef([
    { viewabilityConfig, onViewableItemsChanged },
  ]).current;

  useEffect(() => {
    if (videos.length === 0) {
      router.back();
    }
  }, [videos.length, router]);

  const onRemoveActive = useCallback(() => {
    const v = videos[activeIndex];
    if (!v) return;
    Alert.alert("Remove from playlist?", "This won't delete the video file.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => removeVideoFromPlaylist(playlistId, v.id),
      },
    ]);
  }, [videos, activeIndex, removeVideoFromPlaylist, playlistId]);

  if (!playlist || videos.length === 0) {
    return <View style={{ flex: 1, backgroundColor: "#000" }} />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={listRef}
        data={videos}
        keyExtractor={(v) => v.id}
        renderItem={({ item, index }) => (
          <FeedItem
            video={item}
            isActive={index === activeIndex}
            muted={muted}
            height={itemHeight}
          />
        )}
        pagingEnabled
        snapToInterval={itemHeight}
        snapToAlignment="start"
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        getItemLayout={(_, index) => ({
          length: itemHeight,
          offset: itemHeight * index,
          index,
        })}
        initialScrollIndex={Math.min(initialIndex, videos.length - 1)}
        onScrollToIndexFailed={(info) => {
          setTimeout(() => {
            listRef.current?.scrollToIndex({
              index: info.index,
              animated: false,
            });
          }, 100);
        }}
        viewabilityConfigCallbackPairs={viewabilityPairs}
        windowSize={3}
        maxToRenderPerBatch={2}
        removeClippedSubviews
      />

      <View
        pointerEvents="box-none"
        style={[styles.topOverlay, { paddingTop: insets.top + 8 }]}
      >
        <LinearGradient
          colors={["rgba(0,0,0,0.6)", "rgba(0,0,0,0)"]}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.topRow}>
          <IconButton icon="x" onPress={() => router.back()} color="#fff" />
          <View style={styles.topCenter}>
            <Text style={styles.topPlaylist} numberOfLines={1}>
              {playlist.name}
            </Text>
            <Text style={styles.topIndex}>
              {activeIndex + 1} / {videos.length}
            </Text>
          </View>
          <IconButton
            icon={muted ? "volume-x" : "volume-2"}
            onPress={() => setMuted((m) => !m)}
            color="#fff"
          />
        </View>
      </View>

      <View
        pointerEvents="box-none"
        style={[
          styles.sideRail,
          { bottom: insets.bottom + 80, right: 14 },
        ]}
      >
        <RailButton
          icon="trash-2"
          label="Remove"
          onPress={onRemoveActive}
        />
      </View>

      <View
        pointerEvents="none"
        style={[styles.bottomOverlay, { paddingBottom: insets.bottom + 24 }]}
      >
        <LinearGradient
          colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.7)"]}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.progressTrack}>
          {videos.map((_, i) => (
            <View
              key={i}
              style={[
                styles.progressDot,
                {
                  backgroundColor:
                    i === activeIndex ? colors.primary : "rgba(255,255,255,0.25)",
                  width: i === activeIndex ? 18 : 6,
                },
              ]}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

function FeedItem({
  video,
  isActive,
  muted,
  height,
}: {
  video: Video;
  isActive: boolean;
  muted: boolean;
  height: number;
}) {
  const [showPauseIcon, setShowPauseIcon] = useState(false);
  const [paused, setPaused] = useState(false);
  const player = useVideoPlayer(video.uri, (p) => {
    p.loop = true;
    p.muted = muted;
  });

  useEffect(() => {
    if (isActive && !paused) {
      player.play();
    } else {
      player.pause();
    }
  }, [isActive, paused, player]);

  useEffect(() => {
    player.muted = muted;
  }, [muted, player]);

  const onTap = () => {
    setPaused((p) => {
      const next = !p;
      setShowPauseIcon(true);
      setTimeout(() => setShowPauseIcon(false), 600);
      return next;
    });
  };

  return (
    <Pressable onPress={onTap} style={[styles.item, { height }]}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFillObject}
        contentFit="cover"
        nativeControls={false}
        allowsPictureInPicture={false}
      />
      {showPauseIcon ? (
        <View style={styles.tapIcon} pointerEvents="none">
          <Feather name={paused ? "play" : "pause"} size={56} color="#fff" />
        </View>
      ) : null}
    </Pressable>
  );
}

function RailButton({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.railBtn, { opacity: pressed ? 0.7 : 1 }]}
    >
      <View style={styles.railIcon}>
        <Feather name={icon} size={20} color="#fff" />
      </View>
      <Text style={styles.railLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  item: {
    width: "100%",
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  tapIcon: {
    position: "absolute",
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  topOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingBottom: 24,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 8,
  },
  topCenter: {
    flex: 1,
    alignItems: "center",
  },
  topPlaylist: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  topIndex: {
    color: "rgba(255,255,255,0.75)",
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    marginTop: 2,
  },
  sideRail: {
    position: "absolute",
    alignItems: "center",
    gap: 18,
  },
  railBtn: {
    alignItems: "center",
    gap: 4,
  },
  railIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  railLabel: {
    color: "#fff",
    fontFamily: "Inter_500Medium",
    fontSize: 11,
  },
  bottomOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 36,
    alignItems: "center",
  },
  progressTrack: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    paddingHorizontal: 24,
  },
  progressDot: {
    height: 4,
    borderRadius: 2,
  },
});
