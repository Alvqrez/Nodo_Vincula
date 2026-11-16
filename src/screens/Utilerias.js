import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated,
  Image,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { useDialog } from "../context/DialogContext";
import { Row, Card } from "../components";
import { useFotos } from "../context/FotosContext";
import { getAuthToken } from "../context/AuthContext";
import { API_BASE } from "../config/api";
import apiClient from "../utils/apiClient";

// ── Recursos: utilidades ─────────────────────────────────────────────────────
const MAX_RECURSO_BYTES = 10 * 1024 * 1024;

const DESTINOS = [
  { id: "todos", label: "Todos" },
  { id: "residente", label: "Residentes" },
  { id: "asesor", label: "Asesores" },
  { id: "jefe", label: "Vinculación" },
];
const destinoLabel = (id) => DESTINOS.find((d) => d.id === id)?.label || id;

const formatoTamano = (bytes) => {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatoFechaCorta = (valor) => {
  if (!valor) return "";
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const hayNavegador = () =>
  typeof globalThis.document?.createElement === "function" &&
  typeof globalThis.window?.open === "function";


// ── Toggle de modo oscuro (reemplaza al Switch nativo que es invisible en dark) ──
function ToggleCard({ isDark, toggleDark, TXT, TXTM, CARD, BORD }) {
  const anim = useRef(new Animated.Value(isDark ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: isDark ? 1 : 0,
      duration: 220,
      useNativeDriver: false,
    }).start();
  }, [isDark]);

  // Track: de gris claro a teal
  const trackBg = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ["#CBD5E1", "#0D9488"],
  });
  // Thumb: se desliza de izquierda a derecha
  const thumbX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 22],
  });

  return (
    <View
      style={{
        marginBottom: 20,
        backgroundColor: CARD,
        borderColor: BORD,
        borderWidth: 1,
        borderRadius: 16,
        padding: 16,
      }}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          marginBottom: 16,
        }}
      >
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            backgroundColor: isDark ? "#334155" : "#FEF3C7",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Feather
            name={isDark ? "moon" : "sun"}
            size={16}
            color={isDark ? "#94A3B8" : "#F59E0B"}
          />
        </View>
        <Text style={{ fontSize: 15, fontWeight: "700", color: TXT }}>
          Apariencia
        </Text>
      </View>

      {/* Toggle row */}
      <TouchableOpacity
        onPress={toggleDark}
        activeOpacity={0.85}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          padding: 14,
          backgroundColor: isDark ? "#0F172A" : "#F8FAFC",
          borderRadius: 12,
          borderWidth: 1,
          borderColor: BORD,
        }}
      >
        {/* Ícono + texto */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              backgroundColor: isDark ? "#1E3A5F" : "#FEF3C7",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Feather
              name={isDark ? "moon" : "sun"}
              size={20}
              color={isDark ? "#60A5FA" : "#F59E0B"}
            />
          </View>
          <View>
            <Text style={{ fontSize: 14, fontWeight: "700", color: TXT }}>
              Modo {isDark ? "oscuro" : "claro"}
            </Text>
            <Text style={{ fontSize: 11, color: TXTM, marginTop: 2 }}>
              {isDark ? "Tema oscuro activado" : "Tema claro activado"}
            </Text>
          </View>
        </View>

        {/* Toggle personalizado — siempre visible */}
        <TouchableOpacity onPress={toggleDark} activeOpacity={0.9}>
          <Animated.View
            style={{
              width: 48,
              height: 28,
              borderRadius: 14,
              backgroundColor: trackBg,
              justifyContent: "center",
              borderWidth: 1,
              borderColor: isDark ? "#0D9488" : "#CBD5E1",
            }}
          >
            <Animated.View
              style={{
                position: "absolute",
                left: thumbX,
                width: 22,
                height: 22,
                borderRadius: 11,
                backgroundColor: "white",
                shadowColor: "#000",
                shadowOpacity: 0.2,
                shadowRadius: 3,
                elevation: 2,
              }}
            />
          </Animated.View>
        </TouchableOpacity>
      </TouchableOpacity>

      <Text
        style={{
          fontSize: 11,
          color: TXTM,
          marginTop: 10,
          textAlign: "center",
        }}
      >
        Tu preferencia se guarda automáticamente
      </Text>
    </View>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function Utilerias({ usuario }) {
  
  const { isDark, toggleDark, colors: C } = useTheme();
  const T = C; // Colores dinámicos según el modo
  const { getFoto, setFoto } = useFotos?.() || {};
  const { confirm, notify } = useDialog();

  // ── Datos por rol ─────────────────────────────────────────────
  // Los documentos ya no están aquí: vienen de /api/recursos (los sube Vinculación).
  const ROL_INFO = {
    residente: {
      label: "Residente",
      color: C.teal,
      icon: "user",
      notas: [
        "Entrega tu reporte preliminar antes del 15 de febrero.",
        "Los reportes parciales deben entregarse al final de cada bimestre.",
      ],
    },

    asesor: {
      label: "Asesor",
      color: C.blue,
      icon: "briefcase",
      notas: [
        "Retroalimenta reportes en máximo 7 días.",
      ],
    },

    jefe: {
      label: "Jefe de Vinculación",
      color: C.amber,
      icon: "shield",
      notas: [
        "Valida convenios antes del inicio del semestre.",
      ],
    },
  };

  const rolKey =
    usuario?.rol?.toLowerCase() === "jefe"
      ? "jefe"
      : usuario?.rol?.toLowerCase() || "residente";

  const info = ROL_INFO[rolKey] || ROL_INFO.residente;
  const esJefe = rolKey === "jefe";

  // ── Recursos y documentos (reales) ──────────────────────────────
  const [recursos, setRecursos] = useState([]);
  const [cargandoRecursos, setCargandoRecursos] = useState(true);
  const [errorRecursos, setErrorRecursos] = useState("");
  const [abriendo, setAbriendo] = useState(null);
  const [eliminando, setEliminando] = useState(null);

  // Formulario de publicación (solo jefe)
  const [recTitulo, setRecTitulo] = useState("");
  const [recDescripcion, setRecDescripcion] = useState("");
  const [recDestino, setRecDestino] = useState("todos");
  const [recArchivo, setRecArchivo] = useState(null); // { name, size, data }
  const [recError, setRecError] = useState("");
  const [publicando, setPublicando] = useState(false);

  const cargarRecursos = useCallback(async () => {
    setCargandoRecursos(true);
    setErrorRecursos("");
    const res = await apiClient.get("/api/recursos");
    if (res.ok && res.body?.ok) {
      setRecursos(res.body.recursos || []);
    } else {
      setErrorRecursos(
        res.body?.mensaje || "No se pudieron cargar los documentos.",
      );
    }
    setCargandoRecursos(false);
  }, []);

  useEffect(() => {
    cargarRecursos();
  }, [cargarRecursos]);

  // Abre el PDF en otra pestaña o descarga el DOCX, con el token del usuario
  // (mismo enfoque que al abrir reportes en Seguimiento).
  const abrirRecurso = async (r) => {
    if (!hayNavegador() || !API_BASE) {
      notify({
        type: "info",
        message: "La descarga de documentos está disponible en la versión web.",
      });
      return;
    }
    setAbriendo(r.id);
    try {
      const res = await fetch(`${API_BASE}/recursos/${r.id}/archivo`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      if (!res.ok) {
        let mensaje = "No se pudo abrir el documento.";
        try {
          mensaje = (await res.json()).mensaje || mensaje;
        } catch {
          /* respuesta sin JSON */
        }
        notify({ type: "error", message: mensaje });
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (blob.type === "application/pdf") {
        globalThis.window.open(url, "_blank");
      } else {
        const a = globalThis.document.createElement("a");
        a.href = url;
        a.download = r.nombreArchivo || "documento";
        globalThis.document.body.appendChild(a);
        a.click();
        a.remove();
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      console.error("Error al abrir recurso:", e);
      notify({
        type: "error",
        message: "No se pudo abrir el documento. Revisa tu conexión.",
      });
    } finally {
      setAbriendo(null);
    }
  };

  const seleccionarArchivoRecurso = () => {
    if (!hayNavegador()) {
      notify({
        type: "info",
        message: "La selección de archivos está disponible en la versión web.",
      });
      return;
    }
    const input = globalThis.document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,.docx";
    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
      if (![".pdf", ".docx"].includes(ext)) {
        setRecError("Solo se aceptan archivos PDF o DOCX.");
        return;
      }
      if (file.size > MAX_RECURSO_BYTES) {
        setRecError("El archivo supera el máximo de 10 MB.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        setRecArchivo({ name: file.name, size: file.size, data: ev.target.result });
        setRecError("");
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const publicarRecurso = async () => {
    if (!recTitulo.trim()) {
      setRecError("Escribe el título del documento.");
      return;
    }
    if (!recArchivo) {
      setRecError("Selecciona el archivo PDF o DOCX.");
      return;
    }
    setRecError("");
    setPublicando(true);
    const res = await apiClient.post("/api/recursos", {
      titulo: recTitulo.trim(),
      descripcion: recDescripcion.trim(),
      rol_destino: recDestino,
      archivo: recArchivo.data,
      nombre_archivo: recArchivo.name,
    });
    setPublicando(false);
    if (res.ok && res.body?.ok) {
      setRecTitulo("");
      setRecDescripcion("");
      setRecDestino("todos");
      setRecArchivo(null);
      notify({ type: "success", message: "Documento publicado." });
      cargarRecursos();
    } else {
      setRecError(
        res.body?.mensaje || "No se pudo publicar el documento.",
      );
    }
  };

  const eliminarRecurso = async (r) => {
    const ok = await confirm({
      title: "Eliminar documento",
      message: `¿Eliminar "${r.titulo}"? Dejará de estar disponible para ${destinoLabel(r.rolDestino).toLowerCase()}.`,
      confirmLabel: "Eliminar",
      destructive: true,
    });
    if (!ok) return;
    setEliminando(r.id);
    const res = await apiClient.delete(`/api/recursos/${r.id}`);
    setEliminando(null);
    if (res.ok && res.body?.ok) {
      notify({ type: "success", message: "Documento eliminado." });
      cargarRecursos();
    } else {
      notify({
        type: "error",
        message: res.body?.mensaje || "No se pudo eliminar el documento.",
      });
    }
  };

  const iniciales = usuario
    ? `${(usuario.nombre || "")[0] || ""}${(usuario.apellidos || "")[0] || ""}`.toUpperCase()
    : "??";

  const fotoPerfil = getFoto?.(usuario?.id);

  // Redimensiona y comprime la imagen antes de guardarla.
  // Sin esto, fotos de cámara (5-15 MB) superan el límite de 2 MB del backend.
  const resizeAndCompress = (dataUrl) =>
    new Promise((resolve) => {
      const MAX_PX = 400; // máximo 400×400 px para foto de perfil
      const QUALITY = 0.82; // calidad JPEG

      // Image del DOM (no el componente Image de React Native, que no es constructor).
      const img = new globalThis.Image();
      img.onload = () => {
        const scale = Math.min(1, MAX_PX / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);

        const canvas = globalThis.document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", QUALITY));
      };
      img.src = dataUrl;
    });

  const selectPhoto = () => {
    if (typeof globalThis.document === "undefined") return;
    const input = globalThis.document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const compressed = await resizeAndCompress(ev.target.result);
          setFoto?.(usuario?.id, compressed);
        } catch {
          // Si falla la compresión (ej. entorno sin canvas), intenta con el original
          setFoto?.(usuario?.id, ev.target.result);
        }
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const removePhoto = async () => {
    const ok = await confirm({
      title: "Eliminar foto",
      message: "¿Seguro que quieres eliminar tu foto de perfil?",
      confirmLabel: "Eliminar",
      destructive: true,
    });
    if (ok) setFoto?.(usuario?.id, null);
  };

  // Colores dinámicos: si el modo oscuro está activo, usa la paleta T; si no, usa C
  const BG = T.bg;
  const CARD = T.card;
  const BORD = T.border;
  const TXT = T.text;
  const TXTS = T.textSub;
  const TXTM = T.textMuted;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: BG }}
      contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Foto de perfil ── */}
      <Card
        style={{ marginBottom: 20, backgroundColor: CARD, borderColor: BORD }}
      >
        <Row style={{ alignItems: "center", gap: 10, marginBottom: 14 }}>
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              backgroundColor: info.color + "22",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Feather name="user" size={16} color={info.color} />
          </View>
          <Text style={{ fontSize: 15, fontWeight: "700", color: TXT }}>
            Mi Perfil
          </Text>
        </Row>

        <Row style={{ alignItems: "center", gap: 16 }}>
          {/* Avatar */}
          <View style={{ position: "relative" }}>
            {fotoPerfil ? (
              <View
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 36,
                  overflow: "hidden",
                  borderWidth: 3,
                  borderColor: info.color,
                }}
              >
                {/* eslint-disable-next-line react-native/no-inline-styles */}
                <Image
                 source={{ uri: fotoPerfil }}
                 style={{ width: 72, height: 72 }}
                 />
              </View>
            ) : (
              <View
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 36,
                  backgroundColor: info.color + "22",
                  borderWidth: 3,
                  borderColor: info.color,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{ fontSize: 24, fontWeight: "800", color: info.color }}
                >
                  {iniciales}
                </Text>
              </View>
            )}
            <TouchableOpacity
              onPress={selectPhoto}
              style={{
                position: "absolute",
                bottom: -2,
                right: -2,
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: info.color,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 2,
                borderColor: CARD,
              }}
            >
              <Feather name="camera" size={11} color="white" />
            </TouchableOpacity>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: "800", color: TXT }}>
              {usuario?.nombre} {usuario?.apellidos}
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: info.color,
                fontWeight: "600",
                marginTop: 2,
              }}
            >
              {info.label}
            </Text>
            <Text style={{ fontSize: 11, color: TXTM, marginTop: 2 }}>
              {usuario?.correo}
            </Text>
          </View>
        </Row>

        <Row style={{ gap: 8, marginTop: 14 }}>
          <TouchableOpacity
            onPress={selectPhoto}
            style={{
              flex: 1,
              paddingVertical: 9,
              borderRadius: 8,
              backgroundColor: info.color + "22",
              alignItems: "center",
            }}
          >
            <Row style={{ alignItems: "center", gap: 6 }}>
              <Feather name="upload" size={13} color={info.color} />
              <Text
                style={{ fontSize: 12, fontWeight: "700", color: info.color }}
              >
                {fotoPerfil ? "Cambiar foto" : "Subir foto"}
              </Text>
            </Row>
          </TouchableOpacity>
          {fotoPerfil && (
            <TouchableOpacity
              onPress={removePhoto}
              style={{
                paddingVertical: 9,
                paddingHorizontal: 14,
                borderRadius: 8,
                backgroundColor: C.redLight,
                alignItems: "center",
              }}
            >
              <Feather name="trash-2" size={13} color={C.red} />
            </TouchableOpacity>
          )}
        </Row>

        <Text
          style={{
            fontSize: 10,
            color: TXTM,
            marginTop: 8,
            textAlign: "center",
          }}
        >
          Formatos: JPG, PNG, WEBP · Máx. 5 MB ·{" "}
          {fotoPerfil ? "✓ Foto guardada" : "Sin foto guardada"}
        </Text>
      </Card>

      {/* ── Apariencia (Modo oscuro) ── */}
      <ToggleCard
        isDark={isDark}
        toggleDark={toggleDark}
        TXT={TXT}
        TXTM={TXTM}
        CARD={CARD}
        BORD={BORD}
      />

      {/* ── Recursos y documentos (los publica Vinculación) ── */}
      <Card
        style={{ marginBottom: 20, backgroundColor: CARD, borderColor: BORD }}
      >
        <Row style={{ alignItems: "center", gap: 10, marginBottom: 6 }}>
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              backgroundColor: info.color + "22",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Feather
              name={esJefe ? "folder-plus" : "folder"}
              size={16}
              color={info.color}
            />
          </View>
          <Text style={{ fontSize: 15, fontWeight: "700", color: TXT }}>
            {esJefe ? "Gestionar recursos" : "Recursos y documentos"}
          </Text>
        </Row>
        <Text style={{ fontSize: 12, color: TXTM, marginBottom: 16 }}>
          {esJefe
            ? "Publica guías y formatos oficiales en PDF o DOCX y elige quién los ve."
            : "Guías y formatos oficiales que publica Vinculación."}
        </Text>

        {/* Formulario de publicación (jefe) */}
        {esJefe && (
          <View
            style={{
              padding: 14,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: BORD,
              backgroundColor: isDark ? "#0F172A" : C.bg,
              marginBottom: 16,
              gap: 10,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: "700", color: TXT }}>
              Publicar documento
            </Text>

            <View style={{ gap: 6 }}>
              <Text
                nativeID="recurso-titulo-label"
                style={{ fontSize: 12, fontWeight: "600", color: TXTS }}
              >
                Título
              </Text>
              <TextInput
                value={recTitulo}
                onChangeText={(v) => {
                  setRecTitulo(v);
                  setRecError("");
                }}
                accessibilityLabelledBy="recurso-titulo-label"
                maxLength={150}
                placeholder="Ej.: Formato de reporte preliminar"
                placeholderTextColor={C.textLight}
                style={{
                  padding: 10,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: BORD,
                  backgroundColor: CARD,
                  color: TXT,
                  fontSize: 13,
                }}
              />
            </View>

            <View style={{ gap: 6 }}>
              <Text
                nativeID="recurso-descripcion-label"
                style={{ fontSize: 12, fontWeight: "600", color: TXTS }}
              >
                Descripción (opcional)
              </Text>
              <TextInput
                value={recDescripcion}
                onChangeText={setRecDescripcion}
                accessibilityLabelledBy="recurso-descripcion-label"
                maxLength={500}
                multiline
                numberOfLines={2}
                placeholder="Para qué sirve y cuándo usarlo"
                placeholderTextColor={C.textLight}
                style={{
                  minHeight: 56,
                  padding: 10,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: BORD,
                  backgroundColor: CARD,
                  color: TXT,
                  fontSize: 13,
                  textAlignVertical: "top",
                }}
              />
            </View>

            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 12, fontWeight: "600", color: TXTS }}>
                Visible para
              </Text>
              <Row style={{ gap: 6, flexWrap: "wrap" }}>
                {DESTINOS.map((d) => {
                  const activo = recDestino === d.id;
                  return (
                    <TouchableOpacity
                      key={d.id}
                      onPress={() => setRecDestino(d.id)}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: activo }}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 7,
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: activo ? info.color : BORD,
                        backgroundColor: activo ? info.color + "22" : CARD,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: activo ? "700" : "500",
                          color: activo ? info.color : TXTS,
                        }}
                      >
                        {d.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </Row>
            </View>

            <TouchableOpacity
              onPress={seleccionarArchivoRecurso}
              accessibilityRole="button"
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                padding: 12,
                borderRadius: 8,
                borderWidth: 1,
                borderStyle: "dashed",
                borderColor: recArchivo ? info.color : BORD,
                backgroundColor: CARD,
              }}
            >
              <Feather
                name={recArchivo ? "file-text" : "upload"}
                size={16}
                color={recArchivo ? info.color : TXTM}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={{ fontSize: 13, fontWeight: "600", color: TXT }}
                  numberOfLines={1}
                >
                  {recArchivo ? recArchivo.name : "Seleccionar archivo"}
                </Text>
                <Text style={{ fontSize: 11, color: TXTM, marginTop: 1 }}>
                  {recArchivo
                    ? `${formatoTamano(recArchivo.size)} · toca para cambiarlo`
                    : "PDF o DOCX · máximo 10 MB"}
                </Text>
              </View>
            </TouchableOpacity>

            {recError !== "" && (
              <Row style={{ gap: 6 }}>
                <Feather name="alert-circle" size={13} color={C.red} />
                <Text style={{ flex: 1, fontSize: 12, color: C.red }}>
                  {recError}
                </Text>
              </Row>
            )}

            <TouchableOpacity
              onPress={publicarRecurso}
              disabled={publicando}
              accessibilityRole="button"
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                paddingVertical: 10,
                borderRadius: 8,
                backgroundColor: info.color,
                opacity: publicando ? 0.7 : 1,
              }}
            >
              {publicando ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Feather name="upload-cloud" size={14} color="white" />
              )}
              <Text style={{ fontSize: 13, fontWeight: "700", color: "white" }}>
                {publicando ? "Publicando…" : "Publicar documento"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Lista */}
        {cargandoRecursos && (
          <Row style={{ gap: 10, paddingVertical: 12 }}>
            <ActivityIndicator size="small" color={info.color} />
            <Text style={{ fontSize: 12, color: TXTM }}>
              Cargando documentos…
            </Text>
          </Row>
        )}

        {!cargandoRecursos && errorRecursos !== "" && (
          <Row style={{ gap: 8, paddingVertical: 8 }}>
            <Feather name="alert-circle" size={15} color={C.red} />
            <Text style={{ flex: 1, fontSize: 12, color: TXTS }}>
              {errorRecursos}
            </Text>
            <TouchableOpacity onPress={cargarRecursos} accessibilityRole="button">
              <Text style={{ fontSize: 12, fontWeight: "700", color: info.color }}>
                Reintentar
              </Text>
            </TouchableOpacity>
          </Row>
        )}

        {!cargandoRecursos && !errorRecursos && recursos.length === 0 && (
          <View style={{ alignItems: "center", paddingVertical: 18 }}>
            <Feather name="inbox" size={22} color={TXTM} />
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: TXT,
                marginTop: 8,
                textAlign: "center",
              }}
            >
              {esJefe
                ? "Aún no publicas documentos"
                : "Todavía no hay documentos para ti"}
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: TXTM,
                marginTop: 2,
                textAlign: "center",
              }}
            >
              {esJefe
                ? "Los que publiques aparecerán aquí y en la sección de cada rol."
                : "Aparecerán aquí cuando Vinculación los publique."}
            </Text>
          </View>
        )}

        {!cargandoRecursos && !errorRecursos && recursos.length > 0 && (
          <View style={{ gap: 10 }}>
            {recursos.map((r) => (
              <View
                key={r.id}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  padding: 12,
                  backgroundColor: isDark ? "#0F172A" : C.bg,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: BORD,
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 9,
                    backgroundColor: info.color + "22",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Feather name="file-text" size={16} color={info.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: TXT }}>
                    {r.titulo}
                  </Text>
                  {r.descripcion ? (
                    <Text
                      style={{ fontSize: 12, color: TXTS, marginTop: 2 }}
                      numberOfLines={2}
                    >
                      {r.descripcion}
                    </Text>
                  ) : null}
                  <Text style={{ fontSize: 11, color: TXTM, marginTop: 3 }}>
                    {[
                      r.tipo,
                      formatoTamano(r.tamano),
                      formatoFechaCorta(r.createdAt),
                      esJefe ? `Visible para: ${destinoLabel(r.rolDestino)}` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => abrirRecurso(r)}
                  disabled={abriendo === r.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${r.tipo === "PDF" ? "Abrir" : "Descargar"} ${r.titulo}`}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 8,
                    backgroundColor: info.color + "22",
                  }}
                >
                  {abriendo === r.id ? (
                    <ActivityIndicator size="small" color={info.color} />
                  ) : (
                    <Feather
                      name={r.tipo === "PDF" ? "external-link" : "download"}
                      size={13}
                      color={info.color}
                    />
                  )}
                  <Text
                    style={{ fontSize: 12, fontWeight: "700", color: info.color }}
                  >
                    {r.tipo === "PDF" ? "Abrir" : "Descargar"}
                  </Text>
                </TouchableOpacity>
                {esJefe && (
                  <TouchableOpacity
                    onPress={() => eliminarRecurso(r)}
                    disabled={eliminando === r.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Eliminar ${r.titulo}`}
                    style={{
                      padding: 8,
                      borderRadius: 8,
                      backgroundColor: C.redLight,
                      opacity: eliminando === r.id ? 0.6 : 1,
                    }}
                  >
                    {eliminando === r.id ? (
                      <ActivityIndicator size="small" color={C.red} />
                    ) : (
                      <Feather name="trash-2" size={14} color={C.red} />
                    )}
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}
      </Card>

      {/* ── Contactos importantes ── */}
      <Card
        style={{ marginBottom: 20, backgroundColor: CARD, borderColor: BORD }}
      >
        <Row style={{ alignItems: "center", gap: 10, marginBottom: 16 }}>
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              backgroundColor: C.tealLight,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Feather name="phone" size={16} color={C.teal} />
          </View>
          <Text style={{ fontSize: 15, fontWeight: "700", color: TXT }}>
            Contactos Importantes
          </Text>
        </Row>
        <View style={{ gap: 10 }}>
          {[
            {
              nombre: usuario?.asesorInfo?.nombre || "Asesor asignado",
              correo: usuario?.asesorInfo?.correo || "—",
              rol: "Asesor Académico",
              icon: "briefcase",
              color: C.blue,
            },
            {
              nombre: usuario?.jefeInfo?.nombre || "Jefe de Vinculación",
              correo: usuario?.jefeInfo?.correo || "—",
              rol: "Jefe de Vinculación",
              icon: "shield",
              color: C.amber,
            },
            {
              nombre: "Soporte de NODO Vincula",
              correo: "alvqrez.dev@gmail.com",
              rol: "Soporte técnico",
              icon: "life-buoy",
              color: C.teal,
            },
          ].map((c, i) => (
            <View
              key={i}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                padding: 12,
                backgroundColor: isDark ? "#0F172A" : C.bg,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: BORD,
              }}
            >
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  backgroundColor: c.color + "22",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Feather name={c.icon} size={16} color={c.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: "700", color: TXT }}>
                  {c.nombre}
                </Text>
                <Text
                  style={{ fontSize: 11, color: c.color, fontWeight: "600" }}
                >
                  {c.rol}
                </Text>
                <Text style={{ fontSize: 11, color: TXTM, marginTop: 2 }}>
                  {c.correo}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </Card>

      {/* ── Notas del rol ── */}
      {info.notas?.length > 0 && (
        <Card
          style={{ marginBottom: 20, backgroundColor: CARD, borderColor: BORD }}
        >
          <Row style={{ alignItems: "center", gap: 10, marginBottom: 14 }}>
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: C.amberLight,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Feather name="alert-circle" size={16} color={C.amber} />
            </View>
            <Text style={{ fontSize: 15, fontWeight: "700", color: TXT }}>
              Recordatorios
            </Text>
          </Row>
          <View style={{ gap: 8 }}>
            {info.notas.map((n, i) => (
              <Row key={i} style={{ alignItems: "flex-start", gap: 10 }}>
                <View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: C.amber,
                    marginTop: 6,
                  }}
                />
                <Text
                  style={{ flex: 1, fontSize: 13, color: TXTS, lineHeight: 20 }}
                >
                  {n}
                </Text>
              </Row>
            ))}
          </View>
        </Card>
      )}

      {/* ── Información del sistema ── */}
      <Card style={{ backgroundColor: CARD, borderColor: BORD }}>
        <Row style={{ alignItems: "center", gap: 10, marginBottom: 14 }}>
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              backgroundColor: C.blueLight,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Feather name="info" size={16} color={C.blue} />
          </View>
          <Text style={{ fontSize: 15, fontWeight: "700", color: TXT }}>
            Sistema
          </Text>
        </Row>
        {[
          ["Versión", "VinculaTec 2.0"],
          ["Institución", "Instituto Tecnológico de Veracruz"],
          ["Soporte", "alvqrez.dev@gmail.com"],
        ].map(([label, value]) => (
          <Row
            key={label}
            style={{
              justifyContent: "space-between",
              paddingVertical: 8,
              borderBottomWidth: 1,
              borderBottomColor: BORD,
            }}
          >
            <Text style={{ fontSize: 12, color: TXTM }}>{label}</Text>
            <Text style={{ fontSize: 12, fontWeight: "600", color: TXTS }}>
              {value}
            </Text>
          </Row>
        ))}
      </Card>
    </ScrollView>
  );
}
