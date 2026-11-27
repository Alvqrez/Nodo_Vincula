/** Presenta a Vinculación las fuentes de proyecto y sus acciones de revisión. */

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  Pressable,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { useDialog } from "../context/DialogContext";
import { Row, Card, Badge } from "../components";
import apiClient from "../utils/apiClient";

const TIPO_LABEL = {
  propia: "Propuesta propia",
  banco: "Banco de proyectos",
  empresa: "Empresa",
};

const FILTROS = [
  { id: "Pendiente", label: "Pendientes" },
  { id: "Rechazada", label: "Rechazadas" },
  { id: "Validada", label: "Validadas" },
  { id: "todas", label: "Todas" },
];

const estadoEstilo = (estado, C) => {
  if (estado === "Validada") return { color: C.green, bg: C.greenLight };
  if (estado === "Rechazada") return { color: C.red, bg: C.redLight };
  return { color: C.amber, bg: C.amberLight };
};

const formatoFecha = (iso) =>
  iso
    ? new Date(`${iso}T12:00:00`).toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "";

/**
 * Jefe de Vinculación: valida o rechaza la fuente que declara cada residente
 * (propuesta propia, banco de proyectos o empresa).
 */
export default function ValidacionFuentes() {
  const { colors: C } = useTheme();
  const { confirm, notify } = useDialog();

  const [fuentes, setFuentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filtro, setFiltro] = useState("Pendiente");
  const [busqueda, setBusqueda] = useState("");
  const [procesando, setProcesando] = useState(null);

  // Modal de rechazo
  const [rechazo, setRechazo] = useState(null);
  const [motivo, setMotivo] = useState("");
  const [motivoError, setMotivoError] = useState("");

  const cargar = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await apiClient.get("/api/jefe/fuentes");
    if (res.ok && res.body?.ok) {
      setFuentes(res.body.fuentes || []);
    } else {
      setError(res.body?.mensaje || "No se pudieron cargar las fuentes.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const conteo = useMemo(() => {
    const c = { Pendiente: 0, Rechazada: 0, Validada: 0, todas: fuentes.length };
    fuentes.forEach((f) => {
      if (c[f.estado] !== undefined) c[f.estado] += 1;
    });
    return c;
  }, [fuentes]);

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return fuentes.filter((f) => {
      if (filtro !== "todas" && f.estado !== filtro) return false;
      if (!q) return true;
      return [f.nombre, f.carrera, f.numControl, f.fuenteDeclarada]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [fuentes, filtro, busqueda]);

  const enviarDecision = async (fuente, estado, observaciones) => {
    setProcesando(fuente.id);
    const res = await apiClient.put(`/api/jefe/fuentes/${fuente.id}`, {
      estado,
      observaciones,
    });
    setProcesando(null);
    if (res.ok && res.body?.ok) {
      notify({
        type: "success",
        message:
          estado === "Validada"
            ? `Fuente de ${fuente.nombre} validada.`
            : `Fuente de ${fuente.nombre} rechazada. Se le avisó para corregirla.`,
      });
      cargar();
      return true;
    }
    notify({
      type: "error",
      message: res.body?.mensaje || "No se pudo guardar la decisión.",
    });
    return false;
  };

  const validar = async (fuente) => {
    const ok = await confirm({
      title: "Validar fuente",
      message: `¿Validar la fuente de ${fuente.nombre} (${TIPO_LABEL[fuente.tipoFuente] || fuente.tipoFuente})? El residente recibirá un aviso.`,
      confirmLabel: "Validar",
    });
    if (ok) enviarDecision(fuente, "Validada");
  };

  const abrirRechazo = (fuente) => {
    setRechazo(fuente);
    setMotivo("");
    setMotivoError("");
  };

  const confirmarRechazo = async () => {
    if (!motivo.trim()) {
      setMotivoError("Escribe el motivo para que el residente sepa qué corregir.");
      return;
    }
    const ok = await enviarDecision(rechazo, "Rechazada", motivo.trim());
    if (ok) setRechazo(null);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.bg }}
      contentContainerStyle={{ padding: 24 }}
    >
      {/* Encabezado */}
      <View style={{ marginBottom: 20 }}>
        <Text style={{ fontSize: 22, fontWeight: "800", color: C.text }}>
          Validación de fuentes
        </Text>
        <Text
          style={{
            fontSize: 13,
            color: C.textMuted,
            marginTop: 4,
            lineHeight: 19,
            maxWidth: 640,
          }}
        >
          Cada residente declara de dónde proviene su proyecto. Valídala o
          recházala con un motivo; el residente recibe un aviso en ambos casos.
        </Text>
      </View>

      {/* Filtros */}
      <Row style={{ gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        {FILTROS.map((f) => {
          const activo = filtro === f.id;
          return (
            <TouchableOpacity
              key={f.id}
              onPress={() => setFiltro(f.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: activo }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 20,
                backgroundColor: activo ? C.teal : C.card,
                borderWidth: 1,
                borderColor: activo ? C.teal : C.border,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: activo ? "white" : C.textSub,
                }}
              >
                {f.label}
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  color: activo ? "white" : C.textMuted,
                }}
              >
                {conteo[f.id]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </Row>

      {/* Búsqueda */}
      <Row
        style={{
          gap: 8,
          backgroundColor: C.card,
          borderWidth: 1,
          borderColor: C.border,
          borderRadius: 10,
          paddingHorizontal: 12,
          marginBottom: 18,
        }}
      >
        <Feather name="search" size={15} color={C.textMuted} />
        <TextInput
          value={busqueda}
          onChangeText={setBusqueda}
          placeholder="Buscar por nombre, número de control, carrera o descripción"
          placeholderTextColor={C.textLight}
          accessibilityLabel="Buscar fuentes"
          style={{
            flex: 1,
            paddingVertical: 10,
            fontSize: 14,
            color: C.text,
            outlineStyle: "none",
          }}
        />
        {busqueda.length > 0 && (
          <TouchableOpacity
            onPress={() => setBusqueda("")}
            accessibilityLabel="Limpiar búsqueda"
          >
            <Feather name="x" size={15} color={C.textMuted} />
          </TouchableOpacity>
        )}
      </Row>

      {/* Estados */}
      {loading && (
        <Card style={{ alignItems: "center", paddingVertical: 36 }}>
          <ActivityIndicator color={C.teal} />
          <Text style={{ marginTop: 10, color: C.textMuted, fontSize: 13 }}>
            Cargando fuentes…
          </Text>
        </Card>
      )}

      {!loading && error !== "" && (
        <Card style={{ borderColor: C.red }}>
          <Row style={{ gap: 10 }}>
            <Feather name="alert-circle" size={18} color={C.red} />
            <Text style={{ flex: 1, fontSize: 13, color: C.text }}>{error}</Text>
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

      {!loading && !error && visibles.length === 0 && (
        <Card style={{ alignItems: "center", paddingVertical: 36 }}>
          <Feather name="inbox" size={26} color={C.textLight} />
          <Text
            style={{
              fontSize: 14,
              fontWeight: "700",
              color: C.text,
              marginTop: 10,
            }}
          >
            {fuentes.length === 0
              ? "Aún no hay fuentes registradas"
              : busqueda
                ? "Sin resultados para esa búsqueda"
                : filtro === "Pendiente"
                  ? "No hay fuentes pendientes de revisar"
                  : "No hay fuentes en este estado"}
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: C.textMuted,
              marginTop: 4,
              textAlign: "center",
              maxWidth: 420,
            }}
          >
            {fuentes.length === 0
              ? "Aparecerán aquí cuando los residentes declaren la fuente de su proyecto."
              : "Prueba con otro filtro o término de búsqueda."}
          </Text>
        </Card>
      )}

      {/* Lista */}
      {!loading && !error && visibles.length > 0 && (
        <View style={{ gap: 12 }}>
          {visibles.map((f) => {
            const est = estadoEstilo(f.estado, C);
            const ocupado = procesando === f.id;
            return (
              <Card key={f.id} style={{ padding: 18 }}>
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
                      style={{ fontSize: 15, fontWeight: "800", color: C.text }}
                    >
                      {f.nombre}
                    </Text>
                    <Text
                      style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}
                    >
                      {[f.numControl, f.carrera].filter(Boolean).join(" · ") ||
                        "Sin datos académicos"}
                    </Text>
                  </View>
                  <Badge text={f.estado} color={est.color} bg={est.bg} />
                </Row>

                <Row style={{ gap: 6, marginTop: 12 }}>
                  <Feather name="tag" size={13} color={C.teal} />
                  <Text style={{ fontSize: 13, fontWeight: "700", color: C.teal }}>
                    {TIPO_LABEL[f.tipoFuente] || f.tipoFuente}
                  </Text>
                </Row>
                <Text
                  style={{
                    fontSize: 14,
                    color: C.textSub,
                    lineHeight: 21,
                    marginTop: 6,
                  }}
                >
                  {f.fuenteDeclarada}
                </Text>

                {f.estado === "Rechazada" && f.motivoRechazo && (
                  <Text style={{ fontSize: 13, color: C.red, marginTop: 10 }}>
                    Motivo: {f.motivoRechazo}
                  </Text>
                )}
                {f.estado !== "Pendiente" && (f.revisadoPor || f.fechaRevision) && (
                  <Text style={{ fontSize: 12, color: C.textMuted, marginTop: 8 }}>
                    Revisada
                    {f.revisadoPor ? ` por ${f.revisadoPor}` : ""}
                    {f.fechaRevision ? ` el ${formatoFecha(f.fechaRevision)}` : ""}
                  </Text>
                )}

                {f.estado === "Pendiente" && (
                  <Row style={{ gap: 10, marginTop: 14, flexWrap: "wrap" }}>
                    <TouchableOpacity
                      onPress={() => validar(f)}
                      disabled={ocupado}
                      accessibilityRole="button"
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                        paddingHorizontal: 16,
                        paddingVertical: 9,
                        borderRadius: 8,
                        backgroundColor: C.green,
                        opacity: ocupado ? 0.6 : 1,
                      }}
                    >
                      {ocupado ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <Feather name="check" size={14} color="white" />
                      )}
                      <Text
                        style={{ fontSize: 13, fontWeight: "700", color: "white" }}
                      >
                        Validar
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => abrirRechazo(f)}
                      disabled={ocupado}
                      accessibilityRole="button"
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                        paddingHorizontal: 16,
                        paddingVertical: 9,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: C.red,
                        opacity: ocupado ? 0.6 : 1,
                      }}
                    >
                      <Feather name="x" size={14} color={C.red} />
                      <Text
                        style={{ fontSize: 13, fontWeight: "700", color: C.red }}
                      >
                        Rechazar
                      </Text>
                    </TouchableOpacity>
                  </Row>
                )}
              </Card>
            );
          })}
        </View>
      )}

      {/* Modal: motivo del rechazo */}
      <Modal
        visible={!!rechazo}
        transparent
        animationType="fade"
        onRequestClose={() => setRechazo(null)}
      >
        <Pressable
          onPress={() => (procesando ? null : setRechazo(null))}
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.45)",
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 440,
              backgroundColor: C.card,
              borderRadius: 16,
              padding: 22,
              borderWidth: 1,
              borderColor: C.border,
            }}
          >
            <Text style={{ fontSize: 17, fontWeight: "800", color: C.text }}>
              Rechazar fuente
            </Text>
            <Text style={{ fontSize: 13, color: C.textMuted, marginTop: 4 }}>
              {rechazo?.nombre} recibirá este motivo y podrá corregir su fuente.
            </Text>

            <Text
              nativeID="motivo-rechazo-label"
              style={{
                fontSize: 12,
                fontWeight: "700",
                color: C.textSub,
                marginTop: 16,
                marginBottom: 6,
              }}
            >
              Motivo del rechazo
            </Text>
            <TextInput
              value={motivo}
              onChangeText={(v) => {
                setMotivo(v);
                setMotivoError("");
              }}
              accessibilityLabelledBy="motivo-rechazo-label"
              placeholder="Ej.: Indica qué área de la empresa propuso el proyecto."
              placeholderTextColor={C.textLight}
              multiline
              numberOfLines={4}
              style={{
                minHeight: 90,
                padding: 12,
                borderRadius: 10,
                borderWidth: 1.5,
                borderColor: motivoError ? C.red : C.border,
                backgroundColor: C.bg,
                color: C.text,
                fontSize: 14,
                textAlignVertical: "top",
              }}
            />
            {motivoError !== "" && (
              <Text style={{ fontSize: 12, color: C.red, marginTop: 6 }}>
                {motivoError}
              </Text>
            )}

            <Row style={{ gap: 10, marginTop: 18, justifyContent: "flex-end" }}>
              <TouchableOpacity
                onPress={() => setRechazo(null)}
                disabled={!!procesando}
                accessibilityRole="button"
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 9,
                  borderWidth: 1,
                  borderColor: C.border,
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: "600", color: C.textSub }}>
                  Cancelar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmarRechazo}
                disabled={!!procesando}
                accessibilityRole="button"
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 9,
                  backgroundColor: C.red,
                  opacity: procesando ? 0.7 : 1,
                }}
              >
                {procesando && <ActivityIndicator size="small" color="white" />}
                <Text style={{ fontSize: 14, fontWeight: "700", color: "white" }}>
                  Rechazar
                </Text>
              </TouchableOpacity>
            </Row>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}
