import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";

export type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type Resolver = (value: boolean) => void;

const ConfirmContext = createContext<
  ((options: ConfirmOptions) => Promise<boolean>) | null
>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<Resolver | null>(null);
  const colors = useColors();

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setOptions(opts);
    });
  }, []);

  const close = (value: boolean) => {
    const resolver = resolverRef.current;
    resolverRef.current = null;
    setOptions(null);
    resolver?.(value);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        visible={!!options}
        transparent
        animationType="fade"
        onRequestClose={() => close(false)}
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => close(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={[
              styles.card,
              {
                backgroundColor: colors.cardElevated,
                borderRadius: colors.radius,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.title, { color: colors.foreground }]}>
              {options?.title}
            </Text>
            {options?.message ? (
              <Text style={[styles.body, { color: colors.mutedForeground }]}>
                {options.message}
              </Text>
            ) : null}
            <View style={styles.row}>
              <Pressable
                onPress={() => close(false)}
                style={({ pressed }) => [
                  styles.btn,
                  {
                    backgroundColor: colors.card,
                    opacity: pressed ? 0.75 : 1,
                  },
                ]}
              >
                <Text style={[styles.btnText, { color: colors.foreground }]}>
                  {options?.cancelLabel ?? "Cancel"}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => close(true)}
                style={({ pressed }) => [
                  styles.btn,
                  {
                    backgroundColor: options?.destructive
                      ? colors.destructive
                      : colors.primary,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Text style={[styles.btnText, { color: "#fff" }]}>
                  {options?.confirmLabel ?? "Confirm"}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return ctx;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    padding: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 17,
    marginBottom: 8,
  },
  body: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 18,
  },
  row: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
});
