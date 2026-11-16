import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { useDialog } from "../context/DialogContext";
import { Row, Card, Badge } from "../components";
import apiClient from "../utils/apiClient";

const MAX_DESCRIPCION = 300;

const TIPOS = [
  {
    id: "propia",
    label: "Propuesta propia",
    icon: "user",
    ayuda: "Tú planteaste el proyecto.",
  },
  {
    id: "banco",
    label: "Banco de proyectos",
    icon: "archive",
    ayuda: "Lo elegiste del banco de proyectos de la institución.",
  },
  {
    id: "empresa",
    label: "Empresa",
    icon: "briefcase",
    ayuda: "La empresa u organización propuso el proyecto.",
  },
];

const tipoLabel = (id) => TIPOS.find((t) => t.id === id)?.label || id;

const estadoEstilo = (estado, C) => {
  if (estado === "Validada")
    return { color: C.green, bg: C.greenLight, icon: "check-circle" };
  if (estado === "Rechazada")
    return { color: C.red, bg: C.redLight, icon: "x-circle" };
  return { color: C.amber, bg: C.amberLight, icon: "clock" };
};

const formatoFecha = (iso) =>
  iso
    ? new Date(`${iso}T12:00:00`).toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : null;

/**
 * Residente: declara de dónde proviene su proyecto (propuesta propia, banco de
 * proyectos o empresa) y sigue la validación del Jefe de Vinculación.
 */
export default function FuenteProyecto() {
  const { colors: C } = useTheme();
  const { notify } = useDialog();

  const [fuente, setFuente] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editando, setEditando] = useState(false);
  const [tipo, setTipo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [formError, setFormError] = useState("");
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await apiClient.get("/api/fuentes/mias");
    if (res.ok && res.body?.ok) {
      setFuente(res.body.fuentes?.[0] || null);
    } else {
      setError(
        res.body?.mensaje || "No se pudo cargar tu fuente. Intenta de nuevo.",
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const abrirFormulario = () => {
    setTipo(fuente?.tipo || "");
    setDescripcion(fuente?.descripcion || "");
    setFormError("");
    setEditando(true);
  };

  const guardar = async () => {
    if (!tipo) {
      setFormError("Elige el tipo de fuente.");
      return;
    }
    if (!descripcion.trim()) {
      setFormError("Describe brevemente la fuente de tu proyecto.");
      return;
    }
    setFormError("");
    setEnviando(true);
    const datos = { tipo, descripcion: descripcion.trim() };
    const res = fuente
      ? await apiClient.put(`/api/fuentes/${fuente.id}`, datos)
      : await apiClient.post("/api/fuentes", datos);
    setEnviando(false);

    if (res.ok && res.body?.ok) {
      setEditando(false);
      notify({
        type: "success",
        message: res.body.mensaje || "Fuente guardada.",
      });
      cargar();
    } else {
      setFormError(
        res.body?.mensaje || "No se pudo guardar. Revisa tu conexión.",
      );
    }
  };

  const puedeEditar =
    fuente && (fuente.estado === "Pendiente" || fuente.estado === "Rechazada");
  const mostrarFormulario = editando || (!loading && !error && !fuente);
  const est = fuente ? estadoEstilo(fuente.estado, C) : null;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.bg }}
      contentContainerStyle={{ padding: 24 }}
    >
      {/* Encabezado */}
      <View style={{ marginBottom: 22 }}>
        <Text style={{ fontSize: 22, fontWeight: "800", color: C.text }}>
          Fuente del proyecto
        </Text>
        <Text
          style={{
            fontSize: 13,
            color: C.textMuted,
            marginTop: 4,
            lineHeight: 19,
            maxWidth: 620,
          }}
        >
          Indica de dónde proviene tu proyecto de residencia. El Jefe de
          Vinculación la revisa y te avisa si la valida o si debes corregirla.
        </Text>
      </View>

      {loading && (
        <Card style={{ alignItems: "center", paddingVertical: 36 }}>
          <ActivityIndicator color={C.teal} />
          <Text style={{ marginTop: 10, color: C.textMuted, fontSize: 13 }}>
            Cargando tu fuente…
          </Text>
        </Card>
      )}

      {!loading && error !== "" && (
        <Card style={{ borderColor: C.red }}>
          <Row style={{ gap: 10, alignItems: "flex-start" }}>
            <Feather name="alert-circle" size={18} color={C.red} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: C.text }}>
                No se pudo cargar
              </Text>
              <Text style={{ fontSize: 13, color: C.textMuted, marginTop: 2 }}>
                {error}
              </Text>
            </View>
            <TouchableOpacity
              onPress={cargar}
              accessibilityRole="button"
              style={{
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: C.border,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: "700", color: C.text }}>
                Reintentar
              </Text>
            </TouchableOpacity>
          </Row>
        </Card>
      )}

      {/* Fuente registrada */}
      {!loading && !error && fuente && !editando && (
        <Card style={{ marginBottom: 20 }}>
          <Row
            style={{
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <View style={{ flex: 1, minWidth: 220 }}>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "700",
                  color: C.textMuted,
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                }}
              >
                Tipo de fuente
              </Text>
              <Text
                style={{
                  fontSize: 17,
                  fontWeight: "800",
                  color: C.text,
                  marginTop: 4,
                }}
              >
                {tipoLabel(fuente.tipo)}
              </Text>
            </View>
            <Badge text={fuente.estado} color={est.color} bg={est.bg} />
          </Row>

          <Text
            style={{
              fontSize: 14,
              color: C.textSub,
              lineHeight: 21,
              marginTop: 14,
            }}
          >
            {fuente.descripcion}
          </Text>

          {fuente.estado === "Rechazada" && fuente.observaciones && (
            <View
              style={{
                marginTop: 16,
                padding: 14,
                borderRadius: 10,
                backgroundColor: C.redLight,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: "700", color: C.red }}>
                Motivo del rechazo
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  color: C.text,
                  marginTop: 4,
                  lineHeight: 19,
                }}
              >
                {fuente.observaciones}
              </Text>
            </View>
          )}

          <Text style={{ fontSize: 12, color: C.textMuted, marginTop: 14 }}>
            {fuente.estado === "Pendiente"
              ? "En espera de revisión por Vinculación. Puedes editarla mientras no la revisen."
              : fuente.estado === "Validada"
                ? `Validada${fuente.revisadoPor ? ` por ${fuente.revisadoPor}` : ""}${
                    fuente.fechaRevision
                      ? ` el ${formatoFecha(fuente.fechaRevision)}`
                      : ""
                  }.`
                : `Revisada${fuente.revisadoPor ? ` por ${fuente.revisadoPor}` : ""}${
                    fuente.fechaRevision
                      ? ` el ${formatoFecha(fuente.fechaRevision)}`
                      : ""
                  }. Corrígela y se enviará de nuevo a revisión.`}
          </Text>

          {puedeEditar && (
            <TouchableOpacity
              onPress={abrirFormulario}
              accessibilityRole="button"
              style={{
                marginTop: 16,
                alignSelf: "flex-start",
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 9,
                backgroundColor:
                  fuente.estado === "Rechazada" ? C.teal : "transparent",
                borderWidth: 1,
                borderColor: C.teal,
              }}
            >
              <Feather
                name="edit-2"
                size={14}
                color={fuente.estado === "Rechazada" ? "white" : C.teal}
              />
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "700",
                  color: fuente.estado === "Rechazada" ? "white" : C.teal,
                }}
              >
                {fuente.estado === "Rechazada"
                  ? "Corregir fuente"
                  : "Editar fuente"}
              </Text>
            </TouchableOpacity>
          )}
        </Card>
      )}

      {/* Formulario: declarar o corregir */}
      {mostrarFormulario && (
        <Card>
          <Text style={{ fontSize: 16, fontWeight: "800", color: C.text }}>
            {fuente ? "Corregir fuente" : "Registrar fuente"}
          </Text>
          {!fuente && (
            <Text style={{ fontSize: 13, color: C.textMuted, marginTop: 4 }}>
              Aún no registras la fuente de tu proyecto.
            </Text>
          )}

          <Text
            style={{
              fontSize: 12,
              fontWeight: "700",
              color: C.textSub,
              marginTop: 18,
              marginBottom: 8,
            }}
          >
            Tipo de fuente
          </Text>
          <View style={{ gap: 8 }}>
            {TIPOS.map((t) => {
              const activo = tipo === t.id;
              return (
                <TouchableOpacity
                  key={t.id}
                  onPress={() => {
                    setTipo(t.id);
                    setFormError("");
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: activo }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    padding: 12,
                    borderRadius: 10,
                    borderWidth: 1.5,
                    borderColor: activo ? C.teal : C.border,
                    backgroundColor: activo ? C.tealLighter : C.card,
                  }}
                >
                  <View
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 9,
                      borderWidth: 2,
                      borderColor: activo ? C.teal : C.textLight,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {activo && (
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: C.teal,
                        }}
                      />
                    )}
                  </View>
                  <Feather
                    name={t.icon}
                    size={16}
                    color={activo ? C.teal : C.textMuted}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{ fontSize: 14, fontWeight: "700", color: C.text }}
                    >
                      {t.label}
                    </Text>
                    <Text
                      style={{ fontSize: 12, color: C.textMuted, marginTop: 1 }}
                    >
                      {t.ayuda}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text
            nativeID="fuente-descripcion-label"
            style={{
              fontSize: 12,
              fontWeight: "700",
              color: C.textSub,
              marginTop: 18,
              marginBottom: 8,
            }}
          >
            Descripción
          </Text>
          <TextInput
            value={descripcion}
            onChangeText={(v) => {
              setDescripcion(v.slice(0, MAX_DESCRIPCION));
              setFormError("");
            }}
            accessibilityLabelledBy="fuente-descripcion-label"
            placeholder="Ej.: El área de TI de la empresa propuso automatizar su inventario."
            placeholderTextColor={C.textLight}
            multiline
            numberOfLines={4}
            maxLength={MAX_DESCRIPCION}
            style={{
              minHeight: 96,
              padding: 12,
              borderRadius: 10,
              borderWidth: 1.5,
              borderColor: formError && !descripcion.trim() ? C.red : C.border,
              backgroundColor: C.bg,
              color: C.text,
              fontSize: 14,
              textAlignVertical: "top",
            }}
          />
          <Text
            style={{
              fontSize: 11,
              color: C.textMuted,
              marginTop: 6,
              textAlign: "right",
            }}
          >
            {descripcion.length}/{MAX_DESCRIPCION}
          </Text>

          {formError !== "" && (
            <Row style={{ gap: 6, marginTop: 8 }}>
              <Feather name="alert-circle" size={14} color={C.red} />
              <Text style={{ fontSize: 13, color: C.red, flex: 1 }}>
                {formError}
              </Text>
            </Row>
          )}

          <Row style={{ gap: 10, marginTop: 18, flexWrap: "wrap" }}>
            <TouchableOpacity
              onPress={guardar}
              disabled={enviando}
              accessibilityRole="button"
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                paddingHorizontal: 18,
                paddingVertical: 11,
                borderRadius: 9,
                backgroundColor: C.teal,
                opacity: enviando ? 0.7 : 1,
              }}
            >
              {enviando ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Feather name="send" size={14} color="white" />
              )}
              <Text style={{ fontSize: 14, fontWeight: "700", color: "white" }}>
                {enviando
                  ? "Enviando…"
                  : fuente
                    ? "Enviar corrección"
                    : "Enviar a validación"}
              </Text>
            </TouchableOpacity>
            {fuente && (
              <TouchableOpacity
                onPress={() => {
                  setEditando(false);
                  setFormError("");
                }}
                disabled={enviando}
                accessibilityRole="button"
                style={{
                  paddingHorizontal: 18,
                  paddingVertical: 11,
                  borderRadius: 9,
                  borderWidth: 1,
                  borderColor: C.border,
                }}
              >
                <Text
                  style={{ fontSize: 14, fontWeight: "600", color: C.textSub }}
                >
                  Cancelar
                </Text>
              </TouchableOpacity>
            )}
          </Row>
        </Card>
      )}
    </ScrollView>
  );
}
