/** Presenta la agenda y las operaciones de citas en Expo. */

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { Row, Card, Badge } from "../components";
import { useDialog } from "../context/DialogContext";
import { useWebSocket } from "../context/WebSocketContext";
import apiClient from "../utils/apiClient";

const WEEK_DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];
const FORM_TYPES = [
  "Asesoría",
  "Revisión de avances",
  "Reunión con residente",
  "Reunión con empresa",
  "Reunión con vinculación",
  "Evaluación",
  "Otro",
];
const MODALIDADES = ["Presencial", "Virtual"];

const monthKey = (date) => `${date.getFullYear()}-${date.getMonth()}`;

const formatDateInput = (raw) => {
  const d = raw.replace(/\D/g, "").slice(0, 8);
  if (d.length > 4) return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
  if (d.length > 2) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return d;
};

const formatTimeInput = (raw) => {
  const d = raw.replace(/\D/g, "").slice(0, 4);
  if (d.length > 2) return `${d.slice(0, 2)}:${d.slice(2)}`;
  return d;
};

const validateDate = (str) => {
  const m = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const day = Number(m[1]),
    month = Number(m[2]) - 1,
    year = Number(m[3]);
  const d = new Date(year, month, day);
  if (d.getMonth() !== month || d.getDate() !== day) return null;
  return d;
};

const validateTime = (str) => {
  const m = str.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return false;
  const h = Number(m[1]),
    min = Number(m[2]);
  return h >= 0 && h <= 23 && min >= 0 && min <= 59;
};

const categorizarEvento = (tipo) => {
  if (tipo.includes("Revisión")) return "revision";
  if (tipo.includes("residente") || tipo === "Asesoría") return "residente";
  if (tipo.includes("empresa")) return "empresa";
  return "reunion";
};

const estadoEstilo = (estado, C) => {
  if (estado === "Confirmada") return { color: C.green, bg: C.greenLight };
  if (estado === "Cancelada") return { color: C.textMuted, bg: C.borderLight };
  return { color: C.amber, bg: C.amberLight };
};

const nombreCompleto = (nombre, apellidos) =>
  [nombre, apellidos].filter(Boolean).join(" ").trim();

const ROL_ETIQUETA = {
  residente: "Residente",
  asesor: "Asesor",
  jefe: "Jefe de Vinculación",
};

export default function CalendarioCitas({ usuario }) {
  const { colors: C } = useTheme();
  const { confirm, notify } = useDialog();
  const { subscribe } = useWebSocket() || {};
  const esResidente = usuario?.rol === "residente";
  // undefined = cargando, null = sin asesor, objeto = asesor asignado
  const [asesorResidente, setAsesorResidente] = useState(undefined);
  const CATEGORIES = [
    { id: "todas", label: "Todas", color: C.textMuted },
    { id: "reunion", label: "Reunión", color: C.blue },
    { id: "revision", label: "Revisión", color: C.amber },
    { id: "residente", label: "Residentes", color: C.teal },
    { id: "empresa", label: "Empresa", color: C.purple },
  ];
  const labelStyle = {
    fontSize: 11,
    fontWeight: "700",
    color: C.textSub,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  };
  const [selected, setSelected] = useState(null);
  const [monthDate, setMonthDate] = useState(() => {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), 1);
  });
  const [events, setEvents] = useState({});
  const [upcoming, setUpcoming] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState("todas");
  const [loading, setLoading] = useState(false);

  // Form state
  const [showModal, setShowModal] = useState(false);
  const [formType, setFormType] = useState("Asesoría");
  const [formModalidad, setFormModalidad] = useState("Presencial");
  const [formDate, setFormDate] = useState("");
  const [formTime, setFormTime] = useState("");
  const [formConcepto, setFormConcepto] = useState("");
  const [formNotes, setFormNotes] = useState("");
  // null = cita personal ("Solo yo"); si no, usuarios.id de la persona invitada
  const [formParticipante, setFormParticipante] = useState(null);
  const [busquedaParticipante, setBusquedaParticipante] = useState("");
  const [participantes, setParticipantes] = useState([]);
  const [cargandoParticipantes, setCargandoParticipantes] = useState(true);
  const [dateError, setDateError] = useState("");
  const [timeError, setTimeError] = useState("");
  const [conceptoError, setConceptoError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [accionEnCurso, setAccionEnCurso] = useState(null); // id de la cita que se está actualizando

  // Verificar asesor si el usuario es residente
  useEffect(() => {
    if (!esResidente) {
      setAsesorResidente(true);
      return;
    } // asesores/jefes siempre pasan
    apiClient.get("/api/residente/asesor").then((res) => {
      if (res.ok && res.body?.ok) {
        setAsesorResidente(res.body.asesor ?? null);
      } else {
        setAsesorResidente(null);
      }
    });
  }, [esResidente]);

  // Cargar citas SOLO desde API (no del Context)
  const cargarCitas = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get("/api/citas/mis-citas");
      if (!res.ok || !res.body?.ok) {
        console.warn("Error al cargar citas:", res.body?.mensaje);
        return;
      }

      // Procesar citas desde API
      const evts = {};
      const upcomingList = [];
      const hoy = new Date();

      res.body.citas.forEach((cita) => {
        const fecha = new Date(cita.fecha_hora);
        const key = monthKey(fecha);
        const day = fecha.getDate();
        const cat = categorizarEvento(cita.tipo || "");
        const catColors = {
          revision: C.amber,
          residente: C.teal,
          empresa: C.purple,
          reunion: C.blue,
        };
        const estado = cita.estado || "Pendiente";
        const cancelada = estado === "Cancelada";
        const color = cancelada ? C.textLight : catColors[cat] || C.blue;
        const compartida = Boolean(cita.compartida);
        const soySolicitante = Boolean(cita.soy_solicitante);
        const soyParticipante = Boolean(cita.soy_participante);
        // Con quién es la cita (la otra persona), solo si es compartida
        const con = compartida
          ? soySolicitante
            ? nombreCompleto(cita.participante_nombre, cita.participante_apellidos)
            : nombreCompleto(cita.solicitante_nombre, cita.solicitante_apellidos)
          : null;
        const conRol = compartida
          ? soySolicitante
            ? cita.participante_rol
            : cita.solicitante_rol
          : null;
        const time = fecha.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
        const entry = {
          id: cita.id,
          label: cita.motivo || cita.tipo,
          color,
          bg: color + "22",
          tipo: cita.tipo,
          modalidad: cita.modalidad || "Presencial",
          categoria: cat,
          estado,
          compartida,
          soySolicitante,
          soyParticipante,
          // La otra persona me invitó (no la creé yo)
          meInvitaron: compartida && soyParticipante && !soySolicitante,
          con,
          conRol,
          time,
          fechaTexto: `${day} de ${MONTHS[fecha.getMonth()].toLowerCase()}, ${time}`,
          pasada: fecha < hoy,
        };

        if (!evts[key]) evts[key] = {};
        if (!evts[key][day]) evts[key][day] = [];
        evts[key][day].push(entry);

        if (fecha >= hoy && !cancelada) {
          upcomingList.push({
            ...entry,
            day,
            month: MONTHS[fecha.getMonth()].slice(0, 3),
            monthIndex: fecha.getMonth(),
            year: fecha.getFullYear(),
            title: entry.label,
            icon: entry.modalidad === "Virtual" ? "monitor" : "map-pin",
            timestamp: fecha.getTime(),
          });
        }
      });

      upcomingList.sort((a, b) => a.timestamp - b.timestamp);
      setEvents(evts);
      setUpcoming(upcomingList);
    } catch (err) {
      console.error("Error al obtener citas:", err);
    } finally {
      setLoading(false);
    }
  }, [C]);

  useEffect(() => {
    cargarCitas();
  }, [cargarCitas]);

  // Personas que este usuario puede invitar (el servidor aplica la regla por rol)
  useEffect(() => {
    let activo = true;
    apiClient.get("/api/citas/participantes").then((res) => {
      if (!activo) return;
      setParticipantes(res.ok && res.body?.ok ? res.body.participantes || [] : []);
      setCargandoParticipantes(false);
    });
    return () => {
      activo = false;
    };
  }, []);

  // Tiempo real: invitaciones nuevas y cambios de estado hechos por la otra persona
  useEffect(() => {
    if (!subscribe) return undefined;
    const off1 = subscribe("cita_nueva", () => cargarCitas());
    const off2 = subscribe("cita_actualizada", () => cargarCitas());
    return () => {
      off1();
      off2();
    };
  }, [subscribe, cargarCitas]);

  const monthName = `${MONTHS[monthDate.getMonth()]} ${monthDate.getFullYear()}`;
  const currentEvents = events[monthKey(monthDate)] || {};
  const daysInMonth = new Date(
    monthDate.getFullYear(),
    monthDate.getMonth() + 1,
    0,
  ).getDate();
  const startDay = new Date(
    monthDate.getFullYear(),
    monthDate.getMonth(),
    1,
  ).getDay();

  const cells = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const realToday = new Date();
  const today =
    monthDate.getMonth() === realToday.getMonth() &&
    monthDate.getFullYear() === realToday.getFullYear()
      ? realToday.getDate()
      : null;

  const changeMonth = (delta) => {
    setMonthDate(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1),
    );
    setSelected(null);
  };

  const filteredUpcoming = useMemo(() => {
    if (categoryFilter === "todas") return upcoming;
    return upcoming.filter((e) => e.categoria === categoryFilter);
  }, [upcoming, categoryFilter]);

  const openModal = () => {
    setFormDate("");
    setFormTime("");
    setFormNotes("");
    setFormConcepto("");
    setFormParticipante(null);
    setBusquedaParticipante("");
    setFormType("Asesoría");
    setFormModalidad("Presencial");
    setDateError("");
    setTimeError("");
    setConceptoError("");
    setShowModal(true);
  };

  const participanteSeleccionado = useMemo(
    () => participantes.find((p) => p.id === formParticipante) || null,
    [participantes, formParticipante],
  );

  const participantesFiltrados = useMemo(() => {
    const q = busquedaParticipante.trim().toLowerCase();
    if (!q) return participantes;
    return participantes.filter((p) =>
      `${p.nombre} ${p.contexto || ""}`.toLowerCase().includes(q),
    );
  }, [participantes, busquedaParticipante]);

  // Confirmar o cancelar una cita existente
  const cambiarEstado = async (ev, estado) => {
    if (estado === "Cancelada") {
      const ok = await confirm({
        title: "Cancelar cita",
        message: ev.con
          ? `Se cancelará "${ev.label}" (${ev.fechaTexto}). ${ev.con} recibirá un aviso.`
          : `Se cancelará "${ev.label}" (${ev.fechaTexto}).`,
        confirmLabel: "Cancelar cita",
        cancelLabel: "Volver",
        destructive: true,
      });
      if (!ok) return;
    }

    setAccionEnCurso(ev.id);
    const res = await apiClient.patch(`/api/citas/${ev.id}`, { estado });
    setAccionEnCurso(null);

    if (res.ok && res.body?.ok) {
      notify({
        type: "success",
        title: estado === "Confirmada" ? "Cita confirmada" : "Cita cancelada",
        message: ev.con ? `Se avisó a ${ev.con}.` : "",
      });
      cargarCitas();
    } else {
      notify({
        type: "error",
        title: "No se pudo actualizar la cita",
        message:
          res.body?.mensaje || "Revisa tu conexión e intenta de nuevo.",
      });
    }
  };

  const handleDateChange = (raw) => {
    const fmt = formatDateInput(raw);
    setFormDate(fmt);
    if (fmt.length === 10)
      setDateError(validateDate(fmt) ? "" : "Fecha inválida");
    else setDateError("");
  };

  const handleTimeChange = (raw) => {
    const fmt = formatTimeInput(raw);
    setFormTime(fmt);
    if (fmt.length === 5)
      setTimeError(validateTime(fmt) ? "" : "Hora inválida");
    else setTimeError("");
  };

  // Con quién es la cita, su estado y las acciones disponibles para este usuario
  const renderDetalleCita = (ev) => {
    const est = estadoEstilo(ev.estado, C);
    const puedeConfirmar =
      ev.meInvitaron && ev.estado === "Pendiente" && !ev.pasada;
    const puedeCancelar = ev.estado !== "Cancelada" && !ev.pasada;
    const ocupado = accionEnCurso === ev.id;
    const rol = ev.conRol ? ROL_ETIQUETA[ev.conRol] || ev.conRol : "";

    return (
      <View style={{ marginTop: 6, marginLeft: 18, gap: 8 }}>
        <Row style={{ alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <Feather
            name={ev.con ? "users" : "user"}
            size={11}
            color={C.textMuted}
          />
          <Text style={{ fontSize: 11, color: C.textSub, flexShrink: 1 }}>
            {ev.con
              ? `${ev.meInvitaron ? "Te invitó" : "Con"} ${ev.con}${rol ? ` · ${rol}` : ""}`
              : "Solo en tu calendario"}
          </Text>
          <Badge text={ev.estado} color={est.color} bg={est.bg} />
        </Row>
        {(puedeConfirmar || puedeCancelar) && (
          <Row style={{ gap: 8, flexWrap: "wrap" }}>
            {puedeConfirmar && (
              <TouchableOpacity
                onPress={() => cambiarEstado(ev, "Confirmada")}
                disabled={ocupado}
                accessibilityRole="button"
                accessibilityLabel={`Confirmar la cita ${ev.label}`}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 5,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 8,
                  backgroundColor: C.teal,
                  opacity: ocupado ? 0.6 : 1,
                }}
              >
                <Feather name="check" size={12} color="white" />
                <Text style={{ fontSize: 12, fontWeight: "700", color: "white" }}>
                  Confirmar
                </Text>
              </TouchableOpacity>
            )}
            {puedeCancelar && (
              <TouchableOpacity
                onPress={() => cambiarEstado(ev, "Cancelada")}
                disabled={ocupado}
                accessibilityRole="button"
                accessibilityLabel={`Cancelar la cita ${ev.label}`}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 5,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: C.red,
                  backgroundColor: C.card,
                  opacity: ocupado ? 0.6 : 1,
                }}
              >
                <Feather name="x" size={12} color={C.red} />
                <Text style={{ fontSize: 12, fontWeight: "700", color: C.red }}>
                  Cancelar
                </Text>
              </TouchableOpacity>
            )}
          </Row>
        )}
      </View>
    );
  };

  const confirmAppointment = async () => {
    if (guardando) return;
    const date = validateDate(formDate);

    // Validar fecha
    if (!date) {
      setDateError("Ingresa fecha válida (DD/MM/AAAA)");
      return;
    }

    // Limpiar errores previos
    setDateError("");
    setTimeError("");
    setConceptoError("");

    // Bloquear fechas pasadas
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const fechaComparar = new Date(date);
    fechaComparar.setHours(0, 0, 0, 0);

    if (fechaComparar < hoy) {
      setDateError("No puedes agendar citas en fechas pasadas");
      return;
    }

    // Validar hora
    if (!validateTime(formTime)) {
      setTimeError("Ingresa hora válida (HH:MM)");
      return;
    }

    // Validar concepto
    if (!formConcepto.trim()) {
      setConceptoError("Ingresa el concepto de la cita.");
      return;
    }

    // Aplicar hora real al objeto Date
    const [hours, minutes] = formTime.split(":").map(Number);

    date.setHours(hours);
    date.setMinutes(minutes);
    date.setSeconds(0);
    date.setMilliseconds(0);
    const ahora = new Date();

    if (date < ahora) {
      setTimeError("No puedes agendar citas en horas pasadas");
      return;
    }

    const day = date.getDate();
    const month = date.getMonth();
    const year = date.getFullYear();

    const title = formConcepto.trim();

    // Fecha local SIN problemas de timezone
    const fechaHoraLocal =
      `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")} ` +
      `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;

    // Guardar en API (el servidor valida a quién se puede invitar)
    setGuardando(true);
    const res = await apiClient.post("/api/citas", {
      tipo: formType,
      modalidad: formModalidad,
      motivo: title,
      notas: formNotes.trim() || null,
      participante_id: formParticipante || undefined,
      fecha_hora: fechaHoraLocal,
    });
    setGuardando(false);

    if (!res.ok || !res.body?.ok) {
      notify({
        type: "error",
        title: "No se pudo agendar la cita",
        message: res.body?.mensaje || "Revisa tu conexión e intenta de nuevo.",
      });
      return;
    }

    // Recargar desde el servidor para mostrar la cita tal como quedó guardada
    await cargarCitas();

    // Actualizar calendario
    setMonthDate(new Date(year, month, 1));
    setSelected(day);

    // Cerrar modal
    setShowModal(false);

    notify({
      type: "success",
      title: "Cita agendada",
      message: participanteSeleccionado
        ? `"${title}" · ${formModalidad} · ${formDate} ${formTime}. Se envió la invitación a ${participanteSeleccionado.nombre}.`
        : `"${title}" · ${formModalidad} · ${formDate} ${formTime}.`,
    });
  };

  // ── Bloquear si el residente no tiene asesor asignado ────────────────────
  if (esResidente && asesorResidente === null) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: C.bg }}
        contentContainerStyle={{ padding: 24 }}
      >
        <View>
          <Text
            style={{
              fontSize: 22,
              fontWeight: "800",
              color: C.text,
              marginBottom: 4,
            }}
          >
            Calendario de Citas
          </Text>
          <Text style={{ fontSize: 13, color: C.textMuted, marginBottom: 20 }}>
            Agenda y reuniones
          </Text>
        </View>
        <View
          style={{
            backgroundColor: C.amberLight,
            borderRadius: 14,
            padding: 20,
            borderWidth: 1,
            borderColor: C.amber,
          }}
        >
          <Row style={{ alignItems: "center", gap: 12, marginBottom: 10 }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: C.amber + "33",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Feather name="calendar" size={20} color={C.amber} />
            </View>
            <Text style={{ fontSize: 16, fontWeight: "800", color: C.text }}>
              Sin asesor asignado
            </Text>
          </Row>
          <Text style={{ fontSize: 13, color: C.textSub, lineHeight: 20 }}>
            No puedes agendar citas hasta que el Jefe de Vinculación te asigne
            un asesor.
          </Text>
          <Text style={{ fontSize: 12, color: C.textMuted, marginTop: 10 }}>
            Una vez asignado, podrás coordinar revisiones y reuniones desde
            aquí.
          </Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.bg }}
      contentContainerStyle={{ padding: 24 }}
    >
      {/* Header */}
      <Row
        style={{
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <View>
          <Text style={{ fontSize: 22, fontWeight: "800", color: C.text }}>
            Calendario de Citas
          </Text>
          <Text style={{ fontSize: 13, color: C.textMuted, marginTop: 2 }}>
            Agenda y gestión de reuniones
          </Text>
        </View>
        <TouchableOpacity
          onPress={openModal}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            backgroundColor: C.teal,
            paddingHorizontal: 14,
            paddingVertical: 9,
            borderRadius: 9,
          }}
        >
          <Feather name="plus" size={14} color="white" />
          <Text style={{ color: "white", fontWeight: "700", fontSize: 13 }}>
            Agendar cita
          </Text>
        </TouchableOpacity>
      </Row>

      {/* Category Filter */}
      <Row style={{ gap: 6, marginBottom: 18 }}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            onPress={() => setCategoryFilter(cat.id)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 16,
              backgroundColor: categoryFilter === cat.id ? cat.color : C.card,
              borderWidth: 1,
              borderColor: categoryFilter === cat.id ? cat.color : C.border,
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: "700",
                color: categoryFilter === cat.id ? "white" : C.textMuted,
              }}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </Row>

      <Row style={{ gap: 18, alignItems: "flex-start" }}>
        {/* Calendar */}
        <View style={{ flex: 1 }}>
          <Card style={{ marginBottom: 16 }}>
            <Row
              style={{
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 18,
              }}
            >
              <TouchableOpacity
                onPress={() => changeMonth(-1)}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  borderWidth: 1,
                  borderColor: C.border,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: C.bg,
                }}
              >
                <Feather name="chevron-left" size={16} color={C.textMuted} />
              </TouchableOpacity>
              <Text style={{ fontSize: 15, fontWeight: "800", color: C.text }}>
                {monthName}
              </Text>
              <TouchableOpacity
                onPress={() => changeMonth(1)}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  borderWidth: 1,
                  borderColor: C.border,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: C.bg,
                }}
              >
                <Feather name="chevron-right" size={16} color={C.textMuted} />
              </TouchableOpacity>
            </Row>
            <Row style={{ marginBottom: 8 }}>
              {WEEK_DAYS.map((wd) => (
                <View key={wd} style={{ flex: 1, alignItems: "center" }}>
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "700",
                      color: C.textMuted,
                    }}
                  >
                    {wd}
                  </Text>
                </View>
              ))}
            </Row>
            <View>
              {Array.from({ length: Math.ceil(cells.length / 7) }).map(
                (_, rowIdx) => (
                  <Row key={rowIdx} style={{ marginBottom: 4 }}>
                    {cells
                      .slice(rowIdx * 7, rowIdx * 7 + 7)
                      .map((day, colIdx) => {
                        const hasEvent = day && currentEvents[day];
                        const isSelected = day === selected;
                        const isToday = day === today;
                        return (
                          <TouchableOpacity
                            key={colIdx}
                            onPress={() => day && setSelected(day)}
                            disabled={!day}
                            style={{
                              flex: 1,
                              alignItems: "center",
                              paddingVertical: 6,
                              borderRadius: 9,
                              backgroundColor: isSelected
                                ? C.teal
                                : isToday
                                  ? C.tealLighter
                                  : "transparent",
                              borderWidth: isToday && !isSelected ? 1.5 : 0,
                              borderColor: C.teal,
                              minHeight: 52,
                              justifyContent: "flex-start",
                              paddingTop: 7,
                            }}
                          >
                            {day ? (
                              <>
                                <Text
                                  style={{
                                    fontSize: 13,
                                    fontWeight:
                                      isSelected || isToday ? "800" : "500",
                                    color: isSelected
                                      ? "white"
                                      : isToday
                                        ? C.teal
                                        : C.text,
                                    marginBottom: 3,
                                  }}
                                >
                                  {day}
                                </Text>
                                {hasEvent && (
                                  <View
                                    style={{
                                      gap: 2,
                                      alignItems: "center",
                                      flexDirection: "row",
                                    }}
                                  >
                                    {currentEvents[day]
                                      .slice(0, 3)
                                      .map((ev, ei) => (
                                        <View
                                          key={ei}
                                          style={{
                                            width: 5,
                                            height: 5,
                                            borderRadius: 3,
                                            backgroundColor: isSelected
                                              ? "rgba(255,255,255,0.7)"
                                              : ev.color,
                                          }}
                                        />
                                      ))}
                                  </View>
                                )}
                              </>
                            ) : null}
                          </TouchableOpacity>
                        );
                      })}
                    {cells.slice(rowIdx * 7, rowIdx * 7 + 7).length < 7 &&
                      Array.from({
                        length:
                          7 - cells.slice(rowIdx * 7, rowIdx * 7 + 7).length,
                      }).map((_, pi) => (
                        <View key={`p-${pi}`} style={{ flex: 1 }} />
                      ))}
                  </Row>
                ),
              )}
            </View>
          </Card>

          {/* Selected day events */}
          {selected && (
            <Card>
              <Row style={{ alignItems: "center", gap: 8, marginBottom: 14 }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: C.teal,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{ fontSize: 14, fontWeight: "800", color: "white" }}
                  >
                    {selected}
                  </Text>
                </View>
                <View>
                  <Text
                    style={{ fontSize: 13, fontWeight: "700", color: C.text }}
                  >
                    {selected} de {monthName}
                  </Text>
                  <Text style={{ fontSize: 11, color: C.textMuted }}>
                    {currentEvents[selected]
                      ? `${currentEvents[selected].length} evento(s)`
                      : "Sin eventos"}
                  </Text>
                </View>
              </Row>
              {currentEvents[selected] ? (
                currentEvents[selected].map((ev, i) => (
                  <View
                    key={ev.id ?? i}
                    style={{
                      backgroundColor: ev.bg || ev.color + "22",
                      borderRadius: 9,
                      padding: 11,
                      marginBottom: 8,
                    }}
                  >
                    <Row style={{ alignItems: "center", gap: 10 }}>
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: ev.color,
                        }}
                      />
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "700",
                          color: ev.color,
                          flex: 1,
                        }}
                      >
                        {ev.label}
                      </Text>
                      {ev.modalidad && (
                        <Badge
                          text={ev.modalidad}
                          color={ev.modalidad === "Virtual" ? C.purple : C.teal}
                          bg={
                            ev.modalidad === "Virtual"
                              ? C.purpleLight
                              : C.tealLight
                          }
                        />
                      )}
                    </Row>
                    {ev.tipo && (
                      <Text
                        style={{
                          fontSize: 10,
                          color: C.textMuted,
                          marginTop: 4,
                          marginLeft: 18,
                        }}
                      >
                        {ev.tipo}
                        {ev.time ? ` · ${ev.time}` : ""}
                        {ev.proyecto ? ` · ${ev.proyecto}` : ""}
                      </Text>
                    )}
                    {renderDetalleCita(ev)}
                  </View>
                ))
              ) : (
                <View
                  style={{
                    alignItems: "center",
                    paddingVertical: 18,
                    backgroundColor: C.bg,
                    borderRadius: 10,
                  }}
                >
                  <Feather
                    name="calendar"
                    size={22}
                    color={C.textLight}
                    style={{ marginBottom: 6 }}
                  />
                  <Text style={{ fontSize: 12, color: C.textMuted }}>
                    No hay eventos este día
                  </Text>
                </View>
              )}
            </Card>
          )}
        </View>

        {/* Right: Upcoming filtered */}
        <View style={{ width: 300 }}>
          <Card>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "800",
                color: C.text,
                marginBottom: 14,
              }}
            >
              Próximos Eventos
            </Text>
            {filteredUpcoming.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 20 }}>
                <Feather
                  name="calendar"
                  size={24}
                  color={C.textLight}
                  style={{ marginBottom: 8 }}
                />
                <Text style={{ fontSize: 12, color: C.textMuted }}>
                  Sin eventos próximos
                </Text>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                {filteredUpcoming.slice(0, 8).map((ev, i) => (
                  <TouchableOpacity
                    key={ev.id ?? i}
                    onPress={() => {
                      setMonthDate(new Date(ev.year, ev.monthIndex, 1));
                      setSelected(ev.day);
                    }}
                    activeOpacity={0.8}
                    style={{
                      flexDirection: "row",
                      alignItems: "flex-start",
                      gap: 10,
                      padding: 11,
                      borderRadius: 10,
                      backgroundColor: ev.bg,
                      borderWidth: 1,
                      borderColor:
                        selected === ev.day ? ev.color : "transparent",
                    }}
                  >
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        backgroundColor: ev.color,
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "800",
                          color: "white",
                          lineHeight: 16,
                        }}
                      >
                        {ev.day}
                      </Text>
                      <Text
                        style={{
                          fontSize: 9,
                          color: "rgba(255,255,255,0.8)",
                          fontWeight: "600",
                        }}
                      >
                        {ev.month}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "700",
                          color: ev.color,
                          marginBottom: 2,
                        }}
                        numberOfLines={2}
                      >
                        {ev.title}
                      </Text>
                      <Row style={{ alignItems: "center", gap: 4 }}>
                        <Feather
                          name="clock"
                          size={10}
                          color={ev.color}
                          style={{ opacity: 0.7 }}
                        />
                        <Text
                          style={{
                            fontSize: 10,
                            color: ev.color,
                            opacity: 0.8,
                          }}
                        >
                          {ev.time}
                        </Text>
                      </Row>
                      <Row
                        style={{ alignItems: "center", gap: 6, marginTop: 4 }}
                      >
                        <Badge
                          text={ev.modalidad || "Presencial"}
                          color={ev.modalidad === "Virtual" ? C.purple : C.teal}
                          bg={
                            ev.modalidad === "Virtual"
                              ? C.purpleLight
                              : C.tealLight
                          }
                        />
                        <Badge
                          text={ev.estado}
                          color={estadoEstilo(ev.estado, C).color}
                          bg={estadoEstilo(ev.estado, C).bg}
                        />
                        {ev.proyecto && (
                          <Text style={{ fontSize: 9, color: C.textMuted }}>
                            {ev.proyecto}
                          </Text>
                        )}
                      </Row>
                      {ev.con ? (
                        <Text
                          numberOfLines={1}
                          style={{ fontSize: 10, color: C.textSub, marginTop: 4 }}
                        >
                          {ev.meInvitaron ? "Te invitó" : "Con"} {ev.con}
                        </Text>
                      ) : null}
                      {ev.meInvitaron && ev.estado === "Pendiente" ? (
                        <Text
                          style={{
                            fontSize: 10,
                            fontWeight: "700",
                            color: C.amber,
                            marginTop: 2,
                          }}
                        >
                          Falta tu confirmación
                        </Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <TouchableOpacity
              onPress={openModal}
              style={{
                marginTop: 14,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                borderWidth: 1.5,
                borderColor: C.teal,
                borderRadius: 9,
                paddingVertical: 9,
                borderStyle: "dashed",
              }}
            >
              <Feather name="plus" size={13} color={C.teal} />
              <Text style={{ fontSize: 12, fontWeight: "700", color: C.teal }}>
                Agendar nueva cita
              </Text>
            </TouchableOpacity>
          </Card>
        </View>
      </Row>

      {/* Modal: Agendar Cita */}
      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.45)",
            justifyContent: "center",
            alignItems: "center",
            padding: 24,
          }}
        >
          <View
            style={{
              backgroundColor: C.card,
              borderRadius: 16,
              width: "100%",
              maxWidth: 480,
              shadowColor: "#000",
              shadowOpacity: 0.2,
              shadowRadius: 20,
              elevation: 10,
            }}
          >
            {/* Header */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                padding: 20,
                borderBottomWidth: 1,
                borderBottomColor: C.border,
              }}
            >
              <Row style={{ alignItems: "center", gap: 10 }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: C.tealLight,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Feather name="calendar" size={16} color={C.teal} />
                </View>
                <View>
                  <Text
                    style={{ fontSize: 15, fontWeight: "800", color: C.text }}
                  >
                    Agendar cita
                  </Text>
                  <Text style={{ fontSize: 11, color: C.textMuted }}>
                    Completa los datos
                  </Text>
                </View>
              </Row>
              <TouchableOpacity
                onPress={() => setShowModal(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  backgroundColor: C.bg,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Feather name="x" size={16} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ padding: 20 }}
              keyboardShouldPersistTaps="handled"
            >
              {/* Tipo */}
              <Text style={labelStyle}>Tipo de cita</Text>
              <Row style={{ flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
                {FORM_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t}
                    onPress={() => setFormType(t)}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 16,
                      backgroundColor: formType === t ? C.teal : C.bg,
                      borderWidth: 1,
                      borderColor: formType === t ? C.teal : C.border,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "700",
                        color: formType === t ? "white" : C.textMuted,
                      }}
                    >
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </Row>

              {/* Modalidad */}
              <Text style={labelStyle}>Modalidad</Text>
              <Row style={{ gap: 8, marginBottom: 14 }}>
                {MODALIDADES.map((m) => (
                  <TouchableOpacity
                    key={m}
                    onPress={() => setFormModalidad(m)}
                    style={{
                      flex: 1,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      paddingVertical: 9,
                      borderRadius: 8,
                      borderWidth: 1.5,
                      borderColor: formModalidad === m ? C.teal : C.border,
                      backgroundColor:
                        formModalidad === m ? C.tealLight : "transparent",
                    }}
                  >
                    <Feather
                      name={m === "Virtual" ? "monitor" : "map-pin"}
                      size={13}
                      color={formModalidad === m ? C.teal : C.textMuted}
                    />
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "700",
                        color: formModalidad === m ? C.teal : C.textMuted,
                      }}
                    >
                      {m}
                    </Text>
                  </TouchableOpacity>
                ))}
              </Row>

              {/* Concepto */}
              <Text style={labelStyle}>Concepto de la cita *</Text>
              <TextInput
                value={formConcepto}
                onChangeText={(v) => {
                  setFormConcepto(v);
                  if (conceptoError) setConceptoError("");
                }}
                placeholder="Ej: Revisión de avances del Sprint 2"
                placeholderTextColor={C.textLight}
                maxLength={200}
                style={{
                  padding: 10,
                  borderRadius: 9,
                  borderWidth: 1,
                  borderColor: conceptoError ? C.red : C.border,
                  fontSize: 13,
                  color: C.text,
                  backgroundColor: C.bg,
                  marginBottom: conceptoError ? 4 : 14,
                }}
              />
              {conceptoError ? (
                <Text style={{ fontSize: 11, color: C.red, marginBottom: 12 }}>
                  {conceptoError}
                </Text>
              ) : null}

              {/* Participante */}
              <Text style={labelStyle}>Con quién</Text>
              {participantes.length > 6 && (
                <Row
                  style={{
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: C.border,
                    borderRadius: 9,
                    paddingHorizontal: 12,
                    gap: 8,
                    backgroundColor: C.bg,
                    marginBottom: 8,
                  }}
                >
                  <Feather name="search" size={13} color={C.textMuted} />
                  <TextInput
                    value={busquedaParticipante}
                    onChangeText={setBusquedaParticipante}
                    placeholder="Buscar por nombre, carrera o número de control"
                    placeholderTextColor={C.textLight}
                    accessibilityLabel="Buscar persona para invitar"
                    style={{
                      flex: 1,
                      paddingVertical: 9,
                      fontSize: 13,
                      color: C.text,
                    }}
                  />
                </Row>
              )}
              <View
                style={{
                  borderWidth: 1,
                  borderColor: C.border,
                  borderRadius: 9,
                  marginBottom: 6,
                  overflow: "hidden",
                }}
              >
                <ScrollView
                  style={{ maxHeight: 220 }}
                  nestedScrollEnabled
                  keyboardShouldPersistTaps="handled"
                >
                  {[{ id: null, nombre: "Solo yo", contexto: "Queda solo en tu calendario" }]
                    .concat(participantesFiltrados)
                    .map((p, idx) => {
                      const activo = formParticipante === p.id;
                      return (
                        <TouchableOpacity
                          key={p.id ?? "solo-yo"}
                          onPress={() => setFormParticipante(p.id)}
                          accessibilityRole="radio"
                          accessibilityState={{ selected: activo }}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 10,
                            paddingHorizontal: 12,
                            paddingVertical: 9,
                            backgroundColor: activo ? C.tealLight : C.card,
                            borderTopWidth: idx === 0 ? 0 : 1,
                            borderTopColor: C.borderLight,
                          }}
                        >
                          <Feather
                            name={activo ? "check-circle" : "circle"}
                            size={14}
                            color={activo ? C.teal : C.textLight}
                          />
                          <View style={{ flex: 1 }}>
                            <Text
                              style={{
                                fontSize: 13,
                                fontWeight: activo ? "700" : "500",
                                color: C.text,
                              }}
                              numberOfLines={1}
                            >
                              {p.nombre}
                            </Text>
                            {p.contexto ? (
                              <Text
                                style={{ fontSize: 11, color: C.textMuted }}
                                numberOfLines={1}
                              >
                                {p.contexto}
                              </Text>
                            ) : null}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  {busquedaParticipante.trim() &&
                    participantesFiltrados.length === 0 && (
                      <Text
                        style={{
                          fontSize: 12,
                          color: C.textMuted,
                          padding: 12,
                        }}
                      >
                        Nadie coincide con "{busquedaParticipante.trim()}".
                      </Text>
                    )}
                </ScrollView>
              </View>
              <Text style={{ fontSize: 11, color: C.textMuted, marginBottom: 14 }}>
                {cargandoParticipantes
                  ? "Cargando personas que puedes invitar…"
                  : participanteSeleccionado
                    ? `${participanteSeleccionado.nombre} recibirá un aviso y podrá confirmar o cancelar la cita.`
                    : participantes.length === 0
                      ? "No tienes personas vinculadas para invitar; la cita quedará solo en tu calendario."
                      : "Elige a quién invitar o deja la cita solo en tu calendario."}
              </Text>

              {/* Fecha */}
              <Text style={labelStyle}>Fecha</Text>
              <Row
                style={{
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: dateError ? C.red : C.border,
                  borderRadius: 9,
                  paddingHorizontal: 12,
                  gap: 8,
                  backgroundColor: C.bg,
                  marginBottom: dateError ? 4 : 14,
                }}
              >
                <Feather
                  name="calendar"
                  size={13}
                  color={dateError ? C.red : C.textMuted}
                />
                <TextInput
                  value={formDate}
                  onChangeText={handleDateChange}
                  placeholder="DD / MM / AAAA"
                  placeholderTextColor={C.textLight}
                  keyboardType="numeric"
                  maxLength={10}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    fontSize: 13,
                    color: C.text,
                  }}
                />
                {formDate.length === 10 && !dateError && (
                  <Feather name="check-circle" size={14} color={C.green} />
                )}
              </Row>
              {dateError ? (
                <Text style={{ fontSize: 11, color: C.red, marginBottom: 12 }}>
                  {dateError}
                </Text>
              ) : null}

              {/* Hora */}
              <Text style={labelStyle}>Hora</Text>
              <Row
                style={{
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: timeError ? C.red : C.border,
                  borderRadius: 9,
                  paddingHorizontal: 12,
                  gap: 8,
                  backgroundColor: C.bg,
                  marginBottom: timeError ? 4 : 14,
                }}
              >
                <Feather
                  name="clock"
                  size={13}
                  color={timeError ? C.red : C.textMuted}
                />
                <TextInput
                  value={formTime}
                  onChangeText={handleTimeChange}
                  placeholder="HH : MM"
                  placeholderTextColor={C.textLight}
                  keyboardType="numeric"
                  maxLength={5}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    fontSize: 13,
                    color: C.text,
                  }}
                />
                {formTime.length === 5 && !timeError && (
                  <Feather name="check-circle" size={14} color={C.green} />
                )}
              </Row>
              {timeError ? (
                <Text style={{ fontSize: 11, color: C.red, marginBottom: 12 }}>
                  {timeError}
                </Text>
              ) : null}

              {/* Notas */}
              <Text style={labelStyle}>Notas adicionales</Text>
              <TextInput
                value={formNotes}
                onChangeText={setFormNotes}
                placeholder="Descripción del motivo, lugar, etc..."
                placeholderTextColor={C.textLight}
                multiline
                style={{
                  borderWidth: 1,
                  borderColor: C.border,
                  borderRadius: 9,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  fontSize: 13,
                  color: C.text,
                  backgroundColor: C.bg,
                  textAlignVertical: "top",
                  marginBottom: 20,
                  minHeight: 70,
                }}
              />

              {/* Buttons */}
              <Row style={{ gap: 10, marginBottom: 4 }}>
                <TouchableOpacity
                  onPress={() => setShowModal(false)}
                  style={{
                    flex: 1,
                    borderRadius: 9,
                    paddingVertical: 11,
                    alignItems: "center",
                    backgroundColor: C.bg,
                    borderWidth: 1,
                    borderColor: C.border,
                  }}
                >
                  <Text
                    style={{
                      color: C.textMuted,
                      fontWeight: "700",
                      fontSize: 13,
                    }}
                  >
                    Cancelar
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={confirmAppointment}
                  disabled={guardando}
                  accessibilityRole="button"
                  accessibilityState={{ busy: guardando, disabled: guardando }}
                  style={{
                    flex: 2,
                    backgroundColor: C.teal,
                    borderRadius: 9,
                    paddingVertical: 11,
                    alignItems: "center",
                    flexDirection: "row",
                    justifyContent: "center",
                    gap: 7,
                    opacity: guardando ? 0.7 : 1,
                  }}
                >
                  <Feather
                    name={guardando ? "loader" : "check"}
                    size={14}
                    color="white"
                  />
                  <Text
                    style={{ color: "white", fontWeight: "700", fontSize: 13 }}
                  >
                    {guardando
                      ? "Guardando…"
                      : formParticipante
                        ? "Agendar y enviar invitación"
                        : "Confirmar cita"}
                  </Text>
                </TouchableOpacity>
              </Row>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}
