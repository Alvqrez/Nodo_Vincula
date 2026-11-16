/**
 * DialogContext — confirmaciones, avisos y mensajes dentro de la app.
 *
 * Reemplaza a Alert.alert de React Native, que en la versión web no muestra
 * nada (react-native-web lo implementa como una función vacía).
 *
 * Uso:
 *   const { confirm, notify, alert } = useDialog();
 *   const ok = await confirm({ title, message, destructive: true });
 *   notify({ type: "success", message: "Empresa eliminada" });
 *   await alert({ title, message });
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  Animated,
  Modal,
  Platform,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "./ThemeContext";

const DialogCtx = createContext(null);

const USE_NATIVE_DRIVER = Platform.OS !== "web";

let toastSeq = 0;

// ── Respaldo sin proveedor: nunca debe romper la pantalla ───────────────────
const fallback = {
  confirm: ({
    title = "",
    message = "",
    confirmLabel = "Confirmar",
    cancelLabel = "Cancelar",
    destructive = false,
  } = {}) => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      try {
        return Promise.resolve(
          window.confirm([title, message].filter(Boolean).join("\n\n")),
        );
      } catch {
        return Promise.resolve(false);
      }
    }
    return new Promise((resolve) => {
      Alert.alert(title, message, [
        { text: cancelLabel, style: "cancel", onPress: () => resolve(false) },
        {
          text: confirmLabel,
          style: destructive ? "destructive" : "default",
          onPress: () => resolve(true),
        },
      ]);
    });
  },
  notify: ({ title = "", message = "" } = {}) => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      try {
        window.alert([title, message].filter(Boolean).join("\n\n"));
      } catch {
        /* sin diálogo */
      }
      return;
    }
    Alert.alert(title, message);
  },
  alert: ({ title = "", message = "", okLabel = "Entendido" } = {}) => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      try {
        window.alert([title, message].filter(Boolean).join("\n\n"));
      } catch {
        /* sin diálogo */
      }
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      Alert.alert(title, message, [{ text: okLabel, onPress: () => resolve() }]);
    });
  },
};

// ── Colores por tipo de aviso (tokens del tema actual) ───────────────────────
const toneFor = (type, C) => {
  switch (type) {
    case "success":
      return { color: C.green, bg: C.greenLight, icon: "check-circle" };
    case "error":
      return { color: C.red, bg: C.redLight, icon: "alert-circle" };
    case "warning":
      return { color: C.amber, bg: C.amberLight, icon: "alert-triangle" };
    default:
      return { color: C.blue, bg: C.blueLight, icon: "info" };
  }
};

// ── Modal (confirmación o mensaje de un botón) ───────────────────────────────
function DialogModal({ dialog, onClose }) {
  const { colors: C } = useTheme();
  const anim = useRef(new Animated.Value(0)).current;
  const primaryRef = useRef(null);
  const visible = !!dialog;

  useEffect(() => {
    if (!visible) return;
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration: 180,
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();
    // Web: foco en el botón principal para poder responder con teclado
    if (Platform.OS === "web") {
      const t = setTimeout(() => {
        try {
          primaryRef.current?.focus?.();
        } catch {
          /* sin foco */
        }
      }, 30);
      return () => clearTimeout(t);
    }
  }, [visible, dialog?.id]);

  // Web: Escape cancela
  useEffect(() => {
    if (!visible || Platform.OS !== "web" || typeof document === "undefined")
      return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [visible, onClose]);

  if (!dialog) return null;

  const isConfirm = dialog.kind === "confirm";
  const destructive = isConfirm && dialog.destructive;
  const primaryColor = destructive ? C.red : C.teal;
  const primaryLabel = isConfirm
    ? dialog.confirmLabel || "Confirmar"
    : dialog.okLabel || "Entendido";

  return (
    <Modal
      visible
      transparent
      animationType="none"
      onRequestClose={() => onClose(false)}
    >
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
        }}
      >
        {/* Fondo: tocarlo cancela */}
        <Pressable
          onPress={() => onClose(false)}
          accessibilityRole="button"
          accessibilityLabel="Cerrar"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15,23,42,0.5)",
          }}
        />
        <Animated.View
          accessibilityRole={Platform.OS === "web" ? "dialog" : undefined}
          accessibilityViewIsModal
          aria-modal
          aria-labelledby="vt-dialog-title"
          style={{
            width: "100%",
            maxWidth: 420,
            backgroundColor: C.card,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: C.border,
            padding: 22,
            shadowColor: "#0F172A",
            shadowOpacity: 0.18,
            shadowRadius: 24,
            shadowOffset: { width: 0, height: 10 },
            elevation: 8,
            opacity: anim,
            transform: [
              {
                translateY: anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [12, 0],
                }),
              },
            ],
          }}
        >
          <View style={{ flexDirection: "row", gap: 12, marginBottom: 18 }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: destructive ? C.redLight : C.tealLight,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Feather
                name={destructive ? "alert-triangle" : isConfirm ? "help-circle" : "info"}
                size={18}
                color={destructive ? C.red : C.teal}
              />
            </View>
            <View style={{ flex: 1 }}>
              {!!dialog.title && (
                <Text
                  nativeID="vt-dialog-title"
                  accessibilityRole="header"
                  style={{
                    fontSize: 16,
                    fontWeight: "700",
                    color: C.text,
                    marginBottom: dialog.message ? 6 : 0,
                  }}
                >
                  {dialog.title}
                </Text>
              )}
              {!!dialog.message && (
                <Text style={{ fontSize: 13, lineHeight: 20, color: C.textSub }}>
                  {dialog.message}
                </Text>
              )}
            </View>
          </View>

          <View
            style={{
              flexDirection: "row",
              justifyContent: "flex-end",
              gap: 10,
            }}
          >
            {isConfirm && (
              <TouchableOpacity
                onPress={() => onClose(false)}
                accessibilityRole="button"
                accessibilityLabel={dialog.cancelLabel || "Cancelar"}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 16,
                  borderRadius: 9,
                  borderWidth: 1,
                  borderColor: C.border,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: "600", color: C.textSub }}>
                  {dialog.cancelLabel || "Cancelar"}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              ref={primaryRef}
              onPress={() => onClose(true)}
              accessibilityRole="button"
              accessibilityLabel={primaryLabel}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 18,
                borderRadius: 9,
                backgroundColor: primaryColor,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: "700", color: "#FFFFFF" }}>
                {primaryLabel}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ── Aviso (toast) individual ─────────────────────────────────────────────────
function ToastItem({ toast, onDismiss }) {
  const { colors: C } = useTheme();
  const anim = useRef(new Animated.Value(0)).current;
  const tone = toneFor(toast.type, C);

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();
    if (!toast.duration || toast.duration <= 0) return;
    const t = setTimeout(() => onDismiss(toast.id), toast.duration);
    return () => clearTimeout(t);
  }, []);

  return (
    <Animated.View
      accessibilityRole={Platform.OS === "web" ? "status" : undefined}
      accessibilityLiveRegion="polite"
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 10,
        backgroundColor: C.card,
        borderWidth: 1,
        borderColor: C.border,
        borderLeftWidth: 3,
        borderLeftColor: tone.color,
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 14,
        shadowColor: "#0F172A",
        shadowOpacity: 0.12,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
        elevation: 6,
        opacity: anim,
        transform: [
          {
            translateY: anim.interpolate({
              inputRange: [0, 1],
              outputRange: [10, 0],
            }),
          },
        ],
      }}
    >
      <View
        style={{
          width: 26,
          height: 26,
          borderRadius: 8,
          backgroundColor: tone.bg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Feather name={tone.icon} size={14} color={tone.color} />
      </View>
      <View style={{ flex: 1 }}>
        {!!toast.title && (
          <Text style={{ fontSize: 13, fontWeight: "700", color: C.text }}>
            {toast.title}
          </Text>
        )}
        {!!toast.message && (
          <Text
            style={{
              fontSize: 13,
              lineHeight: 19,
              color: toast.title ? C.textSub : C.text,
              marginTop: toast.title ? 2 : 0,
            }}
          >
            {toast.message}
          </Text>
        )}
      </View>
      <TouchableOpacity
        onPress={() => onDismiss(toast.id)}
        accessibilityRole="button"
        accessibilityLabel="Cerrar aviso"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Feather name="x" size={14} color={C.textMuted} />
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Proveedor ─────────────────────────────────────────────────────────────────
export function DialogProvider({ children }) {
  // Cola de modales: se muestran de uno en uno
  const [queue, setQueue] = useState([]);
  const [toasts, setToasts] = useState([]);
  const seq = useRef(0);

  const enqueue = useCallback(
    (dialog) =>
      new Promise((resolve) => {
        seq.current += 1;
        setQueue((q) => [...q, { ...dialog, id: seq.current, resolve }]);
      }),
    [],
  );

  const confirm = useCallback(
    ({
      title = "",
      message = "",
      confirmLabel = "Confirmar",
      cancelLabel = "Cancelar",
      destructive = false,
    } = {}) =>
      enqueue({
        kind: "confirm",
        title,
        message,
        confirmLabel,
        cancelLabel,
        destructive,
      }),
    [enqueue],
  );

  const alert = useCallback(
    ({ title = "", message = "", okLabel = "Entendido" } = {}) =>
      enqueue({ kind: "alert", title, message, okLabel }).then(() => undefined),
    [enqueue],
  );

  const dismissToast = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const notify = useCallback(
    ({ type = "info", title = "", message = "", duration = 3500 } = {}) => {
      toastSeq += 1;
      const id = `t${toastSeq}`;
      // Máximo 4 avisos visibles a la vez
      setToasts((t) => [...t, { id, type, title, message, duration }].slice(-4));
    },
    [],
  );

  const current = queue[0] || null;

  const closeCurrent = useCallback(
    (result) => {
      setQueue((q) => {
        if (!q.length) return q;
        const [head, ...rest] = q;
        head.resolve(head.kind === "confirm" ? !!result : undefined);
        return rest;
      });
    },
    [],
  );

  const value = useMemo(
    () => ({ confirm, notify, alert }),
    [confirm, notify, alert],
  );

  return (
    <DialogCtx.Provider value={value}>
      {children}

      <DialogModal dialog={current} onClose={closeCurrent} />

      {toasts.length > 0 && (
        <View
          pointerEvents="box-none"
          style={{
            position: Platform.OS === "web" ? "fixed" : "absolute",
            right: 16,
            left: Platform.OS === "web" ? undefined : 16,
            bottom: 24,
            width: Platform.OS === "web" ? 360 : undefined,
            maxWidth: "92%",
            gap: 8,
            zIndex: 1000,
          }}
        >
          {toasts.map((t) => (
            <ToastItem key={t.id} toast={t} onDismiss={dismissToast} />
          ))}
        </View>
      )}
    </DialogCtx.Provider>
  );
}

export function useDialog() {
  return useContext(DialogCtx) || fallback;
}
