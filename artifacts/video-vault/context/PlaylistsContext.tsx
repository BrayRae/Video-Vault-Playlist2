import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Platform } from "react-native";

export type Playlist = {
  id: string;
  name: string;
  cover: string;
  videoIds: string[];
  createdAt: number;
  updatedAt: number;
};

export type Video = {
  id: string;
  uri: string;
  thumbnailUri?: string;
  durationMs?: number;
  addedAt: number;
};

export type NewVideoInput = {
  uri: string;
  durationMs?: number;
};

type State = {
  playlists: Playlist[];
  videos: Record<string, Video>;
};

type ContextValue = {
  ready: boolean;
  playlists: Playlist[];
  videos: Record<string, Video>;
  getPlaylist: (id: string) => Playlist | undefined;
  getVideosForPlaylist: (id: string) => Video[];
  createPlaylist: (input: { name: string; cover: string }) => Playlist;
  updatePlaylist: (
    id: string,
    patch: Partial<Pick<Playlist, "name" | "cover">>,
  ) => void;
  deletePlaylist: (id: string) => void;
  addVideosToPlaylist: (
    playlistId: string,
    inputs: NewVideoInput[],
  ) => Promise<void>;
  removeVideoFromPlaylist: (playlistId: string, videoId: string) => void;
};

const STORAGE_KEY = "video-vault:state:v1";

const PlaylistsContext = createContext<ContextValue | null>(null);

const newId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 9);

async function generateThumbnail(uri: string): Promise<string | undefined> {
  if (Platform.OS === "web") return undefined;
  try {
    const VideoThumbnails = await import("expo-video-thumbnails");
    const { uri: thumb } = await VideoThumbnails.getThumbnailAsync(uri, {
      time: 500,
      quality: 0.6,
    });
    return thumb;
  } catch {
    return undefined;
  }
}

export function PlaylistsProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>({ playlists: [], videos: {} });
  const [ready, setReady] = useState(false);
  const hydrated = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as State;
          if (parsed && Array.isArray(parsed.playlists) && parsed.videos) {
            setState(parsed);
          }
        }
      } catch {
        // ignore corrupt storage
      } finally {
        hydrated.current = true;
        setReady(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
  }, [state]);

  const getPlaylist = useCallback(
    (id: string) => state.playlists.find((p) => p.id === id),
    [state.playlists],
  );

  const getVideosForPlaylist = useCallback(
    (id: string) => {
      const pl = state.playlists.find((p) => p.id === id);
      if (!pl) return [];
      return pl.videoIds
        .map((vid) => state.videos[vid])
        .filter((v): v is Video => Boolean(v));
    },
    [state.playlists, state.videos],
  );

  const createPlaylist = useCallback(
    (input: { name: string; cover: string }) => {
      const playlist: Playlist = {
        id: newId(),
        name: input.name.trim() || "Untitled",
        cover: input.cover,
        videoIds: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setState((s) => ({ ...s, playlists: [playlist, ...s.playlists] }));
      return playlist;
    },
    [],
  );

  const updatePlaylist = useCallback(
    (id: string, patch: Partial<Pick<Playlist, "name" | "cover">>) => {
      setState((s) => ({
        ...s,
        playlists: s.playlists.map((p) =>
          p.id === id
            ? {
                ...p,
                ...patch,
                name: patch.name?.trim() || p.name,
                updatedAt: Date.now(),
              }
            : p,
        ),
      }));
    },
    [],
  );

  const deletePlaylist = useCallback((id: string) => {
    setState((s) => {
      const playlists = s.playlists.filter((p) => p.id !== id);
      const stillReferenced = new Set<string>();
      playlists.forEach((p) => p.videoIds.forEach((v) => stillReferenced.add(v)));
      const videos: Record<string, Video> = {};
      Object.entries(s.videos).forEach(([vid, v]) => {
        if (stillReferenced.has(vid)) videos[vid] = v;
      });
      return { playlists, videos };
    });
  }, []);

  const addVideosToPlaylist = useCallback(
    async (playlistId: string, inputs: NewVideoInput[]) => {
      const newVideos: Video[] = [];
      for (const input of inputs) {
        const id = newId();
        const thumbnailUri = await generateThumbnail(input.uri);
        newVideos.push({
          id,
          uri: input.uri,
          thumbnailUri,
          durationMs: input.durationMs,
          addedAt: Date.now(),
        });
      }
      setState((s) => {
        const videos = { ...s.videos };
        newVideos.forEach((v) => {
          videos[v.id] = v;
        });
        const playlists = s.playlists.map((p) =>
          p.id === playlistId
            ? {
                ...p,
                videoIds: [...p.videoIds, ...newVideos.map((v) => v.id)],
                updatedAt: Date.now(),
              }
            : p,
        );
        return { playlists, videos };
      });
    },
    [],
  );

  const removeVideoFromPlaylist = useCallback(
    (playlistId: string, videoId: string) => {
      setState((s) => {
        const playlists = s.playlists.map((p) =>
          p.id === playlistId
            ? {
                ...p,
                videoIds: p.videoIds.filter((v) => v !== videoId),
                updatedAt: Date.now(),
              }
            : p,
        );
        const stillReferenced = playlists.some((p) => p.videoIds.includes(videoId));
        const videos = { ...s.videos };
        if (!stillReferenced) delete videos[videoId];
        return { playlists, videos };
      });
    },
    [],
  );

  const value = useMemo<ContextValue>(
    () => ({
      ready,
      playlists: state.playlists,
      videos: state.videos,
      getPlaylist,
      getVideosForPlaylist,
      createPlaylist,
      updatePlaylist,
      deletePlaylist,
      addVideosToPlaylist,
      removeVideoFromPlaylist,
    }),
    [
      ready,
      state.playlists,
      state.videos,
      getPlaylist,
      getVideosForPlaylist,
      createPlaylist,
      updatePlaylist,
      deletePlaylist,
      addVideosToPlaylist,
      removeVideoFromPlaylist,
    ],
  );

  return (
    <PlaylistsContext.Provider value={value}>{children}</PlaylistsContext.Provider>
  );
}

export function usePlaylists(): ContextValue {
  const ctx = useContext(PlaylistsContext);
  if (!ctx) {
    throw new Error("usePlaylists must be used within a PlaylistsProvider");
  }
  return ctx;
}
