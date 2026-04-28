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

const TOP_OVERLAY_HEIGHT = 56;
const BOTTOM_OVERLAY_HEIGHT = 130;

export default function FeedScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string; index?: string }>();
  const playlistId = String(params.id);
  const initialIndex = Math.max(0, parseInt(String(params.index ?? "0"), 10) || 0);

  const {
    getPlaylist,
    getVideosForPlaylist,
    removeVideoFromPlaylist,
    deleteVideo,
  } = usePlaylists();
  const playlist = getPlaylist(playlistId);
  const videos = useMemo(
    () => (playlist ? getVideosForPlaylist(playlistId) : []),
    [playlist, getVideosForPlaylist, playlistId],
  );

  const screen = Dimensions.get("window");
  const itemHeight = screen.height;

  const safeTop = insets.top + TOP_OVERLAY_HEIGHT;
  const safeBottom = insets.bottom + BOTTOM_OVERLAY_HEIGHT;

  const [activeIndex, setActiveIndex] = useState(
    Math.min(initialIndex, Math.max(0, videos.length - 1)),
  );
  const [muted, setMuted] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [boostActive, setBoostActive] = useState(false);

  const listRef = useRef<FlatList<Video>>(null);
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 70 }).current;

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems[0];
      if (first && typeof first.index === "number") {
        setActiveIndex(first.index);
        setUserPaused(false);
        setBoostActive(false);
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
      return;
    }
    if (activeIndex > videos.length - 1) {
      const next = videos.length - 1;
      setActiveIndex(next);
      requestAnimationFrame(() => {
        listRef.current?.scrollToIndex({ index: next, animated: false });
      });
    }
  }, [videos.length, activeIndex, router]);

  const togglePause = useCallback(() => {
    setUserPaused((p) => {
      if (Platform.OS !== "web") {
        Haptics.selectionAsync().catch(() => {});
      }
      return !p;
    });
  }, []);

  const onBoostStart = useCallback(() => {
    if (userPaused) return;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    setBoostActive(true);
  }, [userPaused]);

  const onBoostEnd = useCallback(() => {
    setBoostActive(false);
  }, []);

  const onRemoveActive = useCallback(() => {
    const v = videos[activeIndex];
    if (!v) return;
    Alert.alert(v.name, "What would you like to do?", [
      {
        text: "Remove from Playlist",
        onPress: () => removeVideoFromPlaylist(playlistId, v.id),
      },
      {
        text: "Delete Video",
        style: "destructive",
        onPress: () => {
          Alert.alert(
            "Delete this video?",
            "It will be removed from every playlist in your vault.",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Delete",
                style: "destructive",
                onPress: () => deleteVideo(v.id),
              },
            ],
          );
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  }, [videos, activeIndex, removeVideoFromPlaylist, deleteVideo, playlistId]);

  const onRenameActive = useCallback(() => {
    const v = videos[activeIndex];
    if (!v) return;
    router.push({ pathname: "/video/[videoId]", params: { videoId: v.id } });
  }, [videos, activeIndex, router]);

  if (!playlist || videos.length === 0) {
    return <View style={{ flex: 1, backgroundColor: "#000" }} />;
  }

  const currentVideo = videos[activeIndex];

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
            paused={userPaused && index === activeIndex}
            boost={boostActive && index === activeIndex}
            muted={muted}
            height={itemHeight}
            safeTop={safeTop}
            safeBottom={safeBottom}
            onTogglePause={togglePause}
            onBoostStart={onBoostStart}
            onBoostEnd={onBoostEnd}
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

      {boostActive ? (
        <View
          pointerEvents="none"
          style={[styles.boostBadge, { top: insets.top + TOP_OVERLAY_HEIGHT + 12 }]}
        >
          <Feather name="fast-forward" size={14} color="#fff" />
          <Text style={styles.boostText}>2x Speed</Text>
        </View>
      ) : null}

      <View
        pointerEvents="box-none"
        style={[
          styles.sideRail,
          { bottom: insets.bottom + BOTTOM_OVERLAY_HEIGHT - 10, right: 14 },
        ]}
      >
        <RailButton
          icon={userPaused ? "play" : "pause"}
          label={userPaused ? "Play" : "Pause"}
          onPress={togglePause}
          highlight={userPaused}
        />
        <RailButton icon="edit-2" label="Rename" onPress={onRenameActive} />
        <RailButton icon="trash-2" label="Delete" onPress={onRemoveActive} />
      </View>

      <View
        pointerEvents="none"
        style={[styles.bottomOverlay, { paddingBottom: insets.bottom + 18 }]}
      >
        <LinearGradient
          colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.75)"]}
          style={StyleSheet.absoluteFillObject}
        />
        {currentVideo ? (
          <Text numberOfLines={2} style={styles.currentName}>
            {currentVideo.name}
          </Text>
        ) : null}
        <Text style={styles.hintText}>Hold for 2x · Tap to pause</Text>
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
  paused,
  boost,
  muted,
  height,
  safeTop,
  safeBottom,
  onTogglePause,
  onBoostStart,
  onBoostEnd,
}: {
  video: Video;
  isActive: boolean;
  paused: boolean;
  boost: boolean;
  muted: boolean;
  height: number;
  safeTop: number;
  safeBottom: number;
  onTogglePause: () => void;
  onBoostStart: () => void;
  onBoostEnd: () => void;
}) {
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

  useEffect(() => {
    try {
      player.playbackRate = boost ? 2.0 : 1.0;
    } catch {
      // older runtimes may not support; safe to ignore
    }
  }, [boost, player]);

  return (
    <Pressable
      onPress={onTogglePause}
      onLongPress={onBoostStart}
      onPressOut={onBoostEnd}
      delayLongPress={250}
      style={[styles.item, { height }]}
    >
      <View
        style={[
          styles.videoStage,
          {
            top: safeTop,
            bottom: safeBottom,
          },
        ]}
      >
        <VideoView
          player={player}
          style={StyleSheet.absoluteFillObject}
          contentFit="contain"
          nativeControls={false}
          allowsPictureInPicture={false}
        />
      </View>
      {isActive && paused ? (
        <View style={styles.pauseBadge} pointerEvents="none">
          <Feather name="play" size={48} color="#fff" />
        </View>
      ) : null}
    </Pressable>
  );
}

function RailButton({
  icon,
  label,
  onPress,
  highlight,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
  highlight?: boolean;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.railBtn, { opacity: pressed ? 0.7 : 1 }]}
    >
      <View
        style={[
          styles.railIcon,
          highlight
            ? { backgroundColor: colors.primary }
            : { backgroundColor: "rgba(255,255,255,0.18)" },
        ]}
      >
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
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  videoStage: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  pauseBadge: {
    position: "absolute",
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  topOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingBottom: 16,
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
  boostBadge: {
    position: "absolute",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(236,72,153,0.92)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    left: 0,
    right: 0,
    marginHorizontal: "auto",
    width: 110,
    justifyContent: "center",
  },
  boostText: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    letterSpacing: 0.6,
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
    paddingTop: 28,
    alignItems: "center",
    paddingHorizontal: 24,
  },
  currentName: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    textAlign: "center",
    marginBottom: 4,
    maxWidth: "85%",
  },
  hintText: {
    color: "rgba(255,255,255,0.55)",
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    marginBottom: 10,
  },
  progressTrack: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
  },
  progressDot: {
    height: 4,
    borderRadius: 2,
  },
});
