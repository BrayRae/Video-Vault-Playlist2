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

export type Folder = {
  id: string;
  name: string;
  cover: string;
  playlistIds: string[];
  createdAt: number;
  updatedAt: number;
};

export type Video = {
  id: string;
  name: string;
  uri: string;
  thumbnailUri?: string;
  durationMs?: number;
  addedAt: number;
};

export type NewVideoInput = {
  uri: string;
  durationMs?: number;
  name?: string;
};

type State = {
  playlists: Playlist[];
  folders: Folder[];
  videos: Record<string, Video>;
};

type ContextValue = {
  ready: boolean;
  playlists: Playlist[];
  folders: Folder[];
  videos: Record<string, Video>;
  getPlaylist: (id: string) => Playlist | undefined;
  getVideosForPlaylist: (id: string) => Video[];
  findPlaylistForVideo: (videoId: string) =>
    | { playlist: Playlist; index: number }
    | undefined;
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
  deleteVideo: (videoId: string) => void;
  renameVideo: (videoId: string, name: string) => void;
  // Folders
  getFolder: (id: string) => Folder | undefined;
  getPlaylistsForFolder: (id: string) => Playlist[];
  createFolder: (input: { name: string; cover: string }) => Folder;
  updateFolder: (
    id: string,
    patch: Partial<Pick<Folder, "name" | "cover">>,
  ) => void;
  deleteFolder: (id: string) => void;
  addPlaylistsToFolder: (folderId: string, playlistIds: string[]) => void;
  removePlaylistFromFolder: (folderId: string, playlistId: string) => void;
};

const STORAGE_KEY = "video-vault:state:v1";

const PlaylistsContext = createContext<ContextValue | null>(null);

const newId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 9);

function defaultNameFromUri(uri: string, fallback: string): string {
  try {
    const decoded = decodeURIComponent(uri);
    const last = decoded.split(/[\\/]/).pop() ?? "";
    const noExt = last.replace(/\.[^.]+$/, "");
    const cleaned = noExt.trim();
    if (!cleaned) return fallback;
    if (cleaned.length > 60) return cleaned.slice(0, 60);
    return cleaned;
  } catch {
    return fallback;
  }
}

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

function migrate(state: Partial<State>): State {
  const playlists = Array.isArray(state.playlists) ? state.playlists : [];
  const folders = Array.isArray(state.folders) ? state.folders : [];
  const videosRaw =
    state.videos && typeof state.videos === "object" ? state.videos : {};
  const videos: Record<string, Video> = { ...videosRaw };
  Object.entries(videos).forEach(([id, v]) => {
    if (!v.name || typeof v.name !== "string") {
      videos[id] = { ...v, name: defaultNameFromUri(v.uri, "Untitled clip") };
    }
  });
  return { playlists, folders, videos };
}

export function PlaylistsProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>({
    playlists: [],
    folders: [],
    videos: {},
  });
  const [ready, setReady] = useState(false);
  const hydrated = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<State>;
          if (parsed && typeof parsed === "object") {
            setState(migrate(parsed));
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

  const findPlaylistForVideo = useCallback(
    (videoId: string) => {
      for (const p of state.playlists) {
        const i = p.videoIds.indexOf(videoId);
        if (i >= 0) return { playlist: p, index: i };
      }
      return undefined;
    },
    [state.playlists],
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
      const folders = s.folders.map((f) =>
        f.playlistIds.includes(id)
          ? {
              ...f,
              playlistIds: f.playlistIds.filter((pid) => pid !== id),
              updatedAt: Date.now(),
            }
          : f,
      );
      return { playlists, folders, videos };
    });
  }, []);

  const addVideosToPlaylist = useCallback(
    async (playlistId: string, inputs: NewVideoInput[]) => {
      const newVideos: Video[] = [];
      for (let i = 0; i < inputs.length; i++) {
        const input = inputs[i];
        const id = newId();
        const thumbnailUri = await generateThumbnail(input.uri);
        const name =
          input.name?.trim() ||
          defaultNameFromUri(input.uri, `Clip ${Date.now()}`);
        newVideos.push({
          id,
          name,
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
        return { ...s, playlists, videos };
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
        return { ...s, playlists, videos };
      });
    },
    [],
  );

  const deleteVideo = useCallback((videoId: string) => {
    setState((s) => {
      const playlists = s.playlists.map((p) =>
        p.videoIds.includes(videoId)
          ? {
              ...p,
              videoIds: p.videoIds.filter((v) => v !== videoId),
              updatedAt: Date.now(),
            }
          : p,
      );
      const videos = { ...s.videos };
      delete videos[videoId];
      return { ...s, playlists, videos };
    });
  }, []);

  const renameVideo = useCallback((videoId: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setState((s) => {
      const existing = s.videos[videoId];
      if (!existing) return s;
      return {
        ...s,
        videos: {
          ...s.videos,
          [videoId]: { ...existing, name: trimmed.slice(0, 80) },
        },
      };
    });
  }, []);

  // Folders
  const getFolder = useCallback(
    (id: string) => state.folders.find((f) => f.id === id),
    [state.folders],
  );

  const getPlaylistsForFolder = useCallback(
    (id: string) => {
      const f = state.folders.find((x) => x.id === id);
      if (!f) return [];
      return f.playlistIds
        .map((pid) => state.playlists.find((p) => p.id === pid))
        .filter((p): p is Playlist => Boolean(p));
    },
    [state.folders, state.playlists],
  );

  const createFolder = useCallback(
    (input: { name: string; cover: string }) => {
      const folder: Folder = {
        id: newId(),
        name: input.name.trim() || "Untitled",
        cover: input.cover,
        playlistIds: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setState((s) => ({ ...s, folders: [folder, ...s.folders] }));
      return folder;
    },
    [],
  );

  const updateFolder = useCallback(
    (id: string, patch: Partial<Pick<Folder, "name" | "cover">>) => {
      setState((s) => ({
        ...s,
        folders: s.folders.map((f) =>
          f.id === id
            ? {
                ...f,
                ...patch,
                name: patch.name?.trim() || f.name,
                updatedAt: Date.now(),
              }
            : f,
        ),
      }));
    },
    [],
  );

  const deleteFolder = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      folders: s.folders.filter((f) => f.id !== id),
    }));
  }, []);

  const addPlaylistsToFolder = useCallback(
    (folderId: string, playlistIds: string[]) => {
      setState((s) => ({
        ...s,
        folders: s.folders.map((f) => {
          if (f.id !== folderId) return f;
          const merged = [...f.playlistIds];
          playlistIds.forEach((pid) => {
            if (!merged.includes(pid)) merged.push(pid);
          });
          return { ...f, playlistIds: merged, updatedAt: Date.now() };
        }),
      }));
    },
    [],
  );

  const removePlaylistFromFolder = useCallback(
    (folderId: string, playlistId: string) => {
      setState((s) => ({
        ...s,
        folders: s.folders.map((f) =>
          f.id === folderId
            ? {
                ...f,
                playlistIds: f.playlistIds.filter((p) => p !== playlistId),
                updatedAt: Date.now(),
              }
            : f,
        ),
      }));
    },
    [],
  );

  const value = useMemo<ContextValue>(
    () => ({
      ready,
      playlists: state.playlists,
      folders: state.folders,
      videos: state.videos,
      getPlaylist,
      getVideosForPlaylist,
      findPlaylistForVideo,
      createPlaylist,
      updatePlaylist,
      deletePlaylist,
      addVideosToPlaylist,
      removeVideoFromPlaylist,
      deleteVideo,
      renameVideo,
      getFolder,
      getPlaylistsForFolder,
      createFolder,
      updateFolder,
      deleteFolder,
      addPlaylistsToFolder,
      removePlaylistFromFolder,
    }),
    [
      ready,
      state.playlists,
      state.folders,
      state.videos,
      getPlaylist,
      getVideosForPlaylist,
      findPlaylistForVideo,
      createPlaylist,
      updatePlaylist,
      deletePlaylist,
      addVideosToPlaylist,
      removeVideoFromPlaylist,
      deleteVideo,
      renameVideo,
      getFolder,
      getPlaylistsForFolder,
      createFolder,
      updateFolder,
      deleteFolder,
      addPlaylistsToFolder,
      removePlaylistFromFolder,
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
