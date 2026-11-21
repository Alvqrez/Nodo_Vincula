import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";
import { Platform } from "react-native";
import { WS_BASE } from "../config/api";

import { getAuthToken } from "./AuthContext";

const WebSocketCtx = createContext(null);

/**
 * WebSocketProvider
 *
 * FIX: Se agregó un guard para no intentar conectar si WS_BASE es null
 * (ocurre cuando un compañero no tiene .env.local configurado).
 * En ese caso el contexto funciona en modo "sin conexión" y no genera
 * errores en consola en bucle.
 */
export function WebSocketProvider({ children, usuario }) {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);
  const handlersRef = useRef(new Map());
  useEffect(() => {
    // Solo en web
    if (Platform.OS !== "web" || !usuario?.id) return;

    // Guard: si no hay URL configurada, no intentar conectar
    if (!WS_BASE) {
      console.warn(
        "[WebSocket] ⚠️ WS_BASE no configurado. " +
          "Crea .env.local con REACT_APP_API_URL para habilitar tiempo real.",
      );
      return;
    }

    let socket;
    try {
      const { io } = require("socket.io-client");
      socket = io(WS_BASE, {
        autoConnect: true,
        auth: (cb) => cb({ token: getAuthToken() }),
        withCredentials: true,
        reconnection: true,
        reconnectionAttempts: 5, // reducido de 10 a 5
        reconnectionDelay: 3000, // aumentado de 2000 a 3000 ms
        reconnectionDelayMax: 10000, // tope de 10 s entre reintentos
        timeout: 10000,
      });
      socketRef.current = socket;
      // Conectar los suscriptores que se registraron antes de crear el socket
      handlersRef.current.forEach((handlers, event) => {
        handlers.forEach((h) => socket.on(event, h));
      });
    } catch (e) {
      console.warn(
        "[WebSocket] No se pudo inicializar socket.io-client:",
        e.message,
      );
      return;
    }

    socket.on("connect", () => {
      console.log("[WebSocket] ✅ Conectado:", socket.id);
      setConnected(true);
    });

    socket.on("disconnect", (reason) => {
      console.log("[WebSocket] ⚠️ Desconectado:", reason);
      setConnected(false);
    });

    socket.on("connect_error", (err) => {
      // Solo loguear una vez, no en cada reintento
      console.warn("[WebSocket] Error de conexión:", err.message);
    });

    return () => {
      socket.disconnect();
      setConnected(false);
      socketRef.current = null;
    };
  }, [usuario?.id, usuario?.rol]);

  // Los suscriptores se registran aunque el socket aún no exista (las pantallas
  // pueden montarse antes que él); se conectan al socket en cuanto se crea.
  const subscribe = useCallback((event, handler) => {
    const registry = handlersRef.current;
    if (!registry.has(event)) registry.set(event, new Set());
    registry.get(event).add(handler);
    socketRef.current?.on(event, handler);
    return () => {
      registry.get(event)?.delete(handler);
      socketRef.current?.off(event, handler);
    };
  }, []);

  const emit = useCallback((event, data) => {
    socketRef.current?.emit(event, data);
  }, []);

  return (
    <WebSocketCtx.Provider
      value={{ socket: socketRef.current, connected, subscribe, emit }}
    >
      {children}
    </WebSocketCtx.Provider>
  );
}

export function useWebSocket() {
  return useContext(WebSocketCtx);
}
