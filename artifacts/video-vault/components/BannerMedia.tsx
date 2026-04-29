import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import React, { useEffect } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";

import { CoverImage } from "@/components/CoverImage";

export type Banner = {
  kind: "image" | "video";
  uri: string;
};

type Props = {
  banner?: Banner | null;
  fallbackCover?: string;
  style?: ViewStyle;
  rounded?: number;
};

export function BannerMedia({
  banner,
  fallbackCover,
  style,
  rounded = 0,
}: Props) {
  if (banner?.kind === "video") {
    return (
      <View
        style={[styles.wrap, { borderRadius: rounded }, style]}
      >
        <BannerVideo uri={banner.uri} />
      </View>
    );
  }
  if (banner?.kind === "image") {
    return (
      <View style={[styles.wrap, { borderRadius: rounded }, style]}>
        <Image
          source={{ uri: banner.uri }}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
          transition={200}
        />
      </View>
    );
  }
  if (fallbackCover) {
    return (
      <CoverImage cover={fallbackCover} style={style} rounded={rounded} />
    );
  }
  return <View style={[styles.wrap, { borderRadius: rounded }, style]} />;
}

function BannerVideo({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = true;
  });

  useEffect(() => {
    try {
      player.play();
    } catch {
      // ignore
    }
    return () => {
      try {
        player.pause();
      } catch {
        // ignore
      }
    };
  }, [player]);

  return (
    <VideoView
      player={player}
      style={StyleSheet.absoluteFillObject}
      contentFit="cover"
      nativeControls={false}
      allowsPictureInPicture={false}
    />
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: "hidden",
    backgroundColor: "#000",
  },
});
