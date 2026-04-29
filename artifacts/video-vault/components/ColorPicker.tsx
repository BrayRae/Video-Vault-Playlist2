import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
import {
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type LayoutChangeEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IconButton } from "@/components/IconButton";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useColors } from "@/hooks/useColors";
import {
  clamp,
  hexToHsv,
  hsvToHex,
  hueToHex,
  isValidHex,
  normalizeHex,
} from "@/lib/colorUtils";

const PRESET_COLORS = [
  "#FFFFFF",
  "#000000",
  "#0F0B1E",
  "#1B1230",
  "#241537",
  "#EC4899",
  "#A855F7",
  "#8B5CF6",
  "#6366F1",
  "#3B82F6",
  "#06B6D4",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#FACC15",
];

type Props = {
  visible: boolean;
  initialHex: string;
  title?: string;
  onClose: () => void;
  onConfirm: (hex: string) => void;
};

export function ColorPicker({
  visible,
  initialHex,
  title = "Pick Color",
  onClose,
  onConfirm,
}: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [h, setH] = useState(0);
  const [s, setS] = useState(1);
  const [v, setV] = useState(1);
  const [hexInput, setHexInput] = useState(initialHex);

  useEffect(() => {
    if (!visible) return;
    const parsed = hexToHsv(initialHex);
    if (parsed) {
      setH(parsed.h);
      setS(parsed.s);
      setV(parsed.v);
      setHexInput(initialHex.toUpperCase());
    } else {
      setHexInput(initialHex);
    }
  }, [visible, initialHex]);

  const currentHex = hsvToHex({ h, s, v });

  useEffect(() => {
    setHexInput(currentHex);
  }, [currentHex]);

  const onHexSubmit = (text: string) => {
    if (!isValidHex(text)) {
      setHexInput(currentHex);
      return;
    }
    const norm = normalizeHex(text);
    const hsv = hexToHsv(norm);
    if (hsv) {
      setH(hsv.h);
      setS(hsv.s);
      setV(hsv.v);
    }
  };

  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top + 8;
  const bottomPad = isWeb ? 34 : insets.bottom + 16;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.background,
              borderColor: colors.border,
              borderRadius: colors.radius * 1.4,
              marginTop: topPad + 20,
              marginBottom: bottomPad + 20,
            },
          ]}
        >
          <View style={styles.header}>
            <IconButton icon="x" onPress={onClose} background="solid" />
            <Text style={[styles.title, { color: colors.foreground }]}>
              {title}
            </Text>
            <View style={{ width: 44 }} />
          </View>

          <View style={styles.preview}>
            <View
              style={[
                styles.previewSwatch,
                {
                  backgroundColor: currentHex,
                  borderColor: colors.border,
                },
              ]}
            />
            <View>
              <Text
                style={[
                  styles.previewLabel,
                  { color: colors.mutedForeground },
                ]}
              >
                Selected
              </Text>
              <Text
                style={[styles.previewHex, { color: colors.foreground }]}
                selectable
              >
                {currentHex}
              </Text>
            </View>
          </View>

          <SVSquare hue={h} s={s} v={v} onChange={(ns, nv) => {
            setS(ns);
            setV(nv);
          }} />

          <HueSlider hue={h} onChange={setH} />

          <View style={styles.hexRow}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
              Hex
            </Text>
            <TextInput
              value={hexInput}
              onChangeText={(t) => setHexInput(t.toUpperCase())}
              onBlur={() => onHexSubmit(hexInput)}
              onSubmitEditing={() => onHexSubmit(hexInput)}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={7}
              placeholder="#RRGGBB"
              placeholderTextColor={colors.mutedForeground}
              style={[
                styles.hexInput,
                {
                  backgroundColor: colors.input,
                  color: colors.foreground,
                  borderRadius: 10,
                },
              ]}
            />
          </View>

          <View style={styles.rgbRow}>
            <RgbField
              label="R"
              value={Math.round(hsvToRgbChannel({ h, s, v }, "r"))}
              onChange={(n) => {
                const next = updateRgb({ h, s, v }, "r", n);
                setH(next.h);
                setS(next.s);
                setV(next.v);
              }}
            />
            <RgbField
              label="G"
              value={Math.round(hsvToRgbChannel({ h, s, v }, "g"))}
              onChange={(n) => {
                const next = updateRgb({ h, s, v }, "g", n);
                setH(next.h);
                setS(next.s);
                setV(next.v);
              }}
            />
            <RgbField
              label="B"
              value={Math.round(hsvToRgbChannel({ h, s, v }, "b"))}
              onChange={(n) => {
                const next = updateRgb({ h, s, v }, "b", n);
                setH(next.h);
                setS(next.s);
                setV(next.v);
              }}
            />
          </View>

          <Text style={[styles.fieldLabel, { color: colors.mutedForeground, marginTop: 18 }]}>
            Presets
          </Text>
          <View style={styles.presets}>
            {PRESET_COLORS.map((c) => (
              <Pressable
                key={c}
                onPress={() => onHexSubmit(c)}
                style={({ pressed }) => [
                  styles.presetSwatch,
                  {
                    backgroundColor: c,
                    borderColor:
                      currentHex.toUpperCase() === c
                        ? colors.primary
                        : "rgba(255,255,255,0.18)",
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              />
            ))}
          </View>

          <View style={{ marginTop: 22 }}>
            <PrimaryButton
              label="Apply Color"
              icon="check"
              onPress={() => onConfirm(currentHex)}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function SVSquare({
  hue,
  s,
  v,
  onChange,
}: {
  hue: number;
  s: number;
  v: number;
  onChange: (s: number, v: number) => void;
}) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const sizeRef = useRef({ w: 0, h: 0 });

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    sizeRef.current = { w: width, h: height };
    setSize({ w: width, h: height });
  };

  const updateFromTouch = (locX: number, locY: number) => {
    const w = sizeRef.current.w;
    const hh = sizeRef.current.h;
    if (w === 0 || hh === 0) return;
    const newS = clamp(locX / w, 0, 1);
    const newV = clamp(1 - locY / hh, 0, 1);
    onChange(newS, newV);
  };

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        updateFromTouch(e.nativeEvent.locationX, e.nativeEvent.locationY);
      },
      onPanResponderMove: (e) => {
        updateFromTouch(e.nativeEvent.locationX, e.nativeEvent.locationY);
      },
    }),
  ).current;

  const hueHex = hueToHex(hue);
  const thumbX = s * size.w;
  const thumbY = (1 - v) * size.h;

  return (
    <View
      onLayout={onLayout}
      style={styles.svSquare}
      {...responder.panHandlers}
    >
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: hueHex }]} />
      <LinearGradient
        colors={["#FFFFFF", "rgba(255,255,255,0)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFillObject}
      />
      <LinearGradient
        colors={["rgba(0,0,0,0)", "#000000"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View
        pointerEvents="none"
        style={[
          styles.thumb,
          {
            left: thumbX - 10,
            top: thumbY - 10,
          },
        ]}
      />
    </View>
  );
}

function HueSlider({
  hue,
  onChange,
}: {
  hue: number;
  onChange: (h: number) => void;
}) {
  const [width, setWidth] = useState(0);
  const widthRef = useRef(0);

  const onLayout = (e: LayoutChangeEvent) => {
    widthRef.current = e.nativeEvent.layout.width;
    setWidth(e.nativeEvent.layout.width);
  };

  const updateFromTouch = (x: number) => {
    if (widthRef.current === 0) return;
    const ratio = clamp(x / widthRef.current, 0, 1);
    onChange(ratio * 360);
  };

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => updateFromTouch(e.nativeEvent.locationX),
      onPanResponderMove: (e) => updateFromTouch(e.nativeEvent.locationX),
    }),
  ).current;

  const thumbX = (hue / 360) * width;

  return (
    <View
      onLayout={onLayout}
      style={styles.hueWrap}
      {...responder.panHandlers}
    >
      <LinearGradient
        colors={[
          "#FF0000",
          "#FFFF00",
          "#00FF00",
          "#00FFFF",
          "#0000FF",
          "#FF00FF",
          "#FF0000",
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View
        pointerEvents="none"
        style={[
          styles.hueThumb,
          {
            left: thumbX - 10,
          },
        ]}
      />
    </View>
  );
}

function RgbField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  const colors = useColors();
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  const commit = (t: string) => {
    const n = parseInt(t.replace(/[^0-9]/g, ""), 10);
    if (Number.isFinite(n)) onChange(clamp(n, 0, 255));
    else setText(String(value));
  };

  return (
    <View style={styles.rgbField}>
      <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
        {label}
      </Text>
      <TextInput
        value={text}
        onChangeText={setText}
        onBlur={() => commit(text)}
        onSubmitEditing={() => commit(text)}
        keyboardType="number-pad"
        maxLength={3}
        style={[
          styles.rgbInput,
          {
            backgroundColor: colors.input,
            color: colors.foreground,
            borderRadius: 10,
          },
        ]}
      />
    </View>
  );
}

function hsvToRgbChannel(
  hsv: { h: number; s: number; v: number },
  channel: "r" | "g" | "b",
): number {
  const hex = hsvToHex(hsv);
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return channel === "r" ? r : channel === "g" ? g : b;
}

function updateRgb(
  hsv: { h: number; s: number; v: number },
  channel: "r" | "g" | "b",
  newValue: number,
): { h: number; s: number; v: number } {
  const r0 = hsvToRgbChannel(hsv, "r");
  const g0 = hsvToRgbChannel(hsv, "g");
  const b0 = hsvToRgbChannel(hsv, "b");
  const r = channel === "r" ? clamp(newValue, 0, 255) : r0;
  const g = channel === "g" ? clamp(newValue, 0, 255) : g0;
  const b = channel === "b" ? clamp(newValue, 0, 255) : b0;
  // RGB → HSV
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = hsv.h;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  const v = max;
  return { h, s, v };
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 22,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  title: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
  preview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 16,
  },
  previewSwatch: {
    width: 56,
    height: 56,
    borderRadius: 14,
    borderWidth: 1,
  },
  previewLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  previewHex: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    marginTop: 2,
    letterSpacing: 0.4,
  },
  svSquare: {
    height: 180,
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 14,
    position: "relative",
  },
  thumb: {
    position: "absolute",
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: "#fff",
    backgroundColor: "transparent",
  },
  hueWrap: {
    height: 24,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
    marginBottom: 16,
  },
  hueThumb: {
    position: "absolute",
    top: -2,
    width: 20,
    height: 28,
    borderRadius: 6,
    borderWidth: 3,
    borderColor: "#fff",
    backgroundColor: "transparent",
  },
  hexRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  fieldLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    width: 40,
  },
  hexInput: {
    flex: 1,
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    letterSpacing: 0.4,
  },
  rgbRow: {
    flexDirection: "row",
    gap: 10,
  },
  rgbField: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rgbInput: {
    flex: 1,
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlign: "center",
  },
  presets: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  presetSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
  },
});
