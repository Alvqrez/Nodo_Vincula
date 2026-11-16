import { useState, useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  Text,
  TextInput,
  Platform,
  View,
  ActivityIndicator,
} from "react-native";
import {
  useFonts,
  Sora_400Regular,
  Sora_500Medium,
  Sora_600SemiBold,
  Sora_700Bold,
  Sora_800ExtraBold,
} from "@expo-google-fonts/sora";

import LoginScreen from "./src/shared/LoginScreen";
import ResidenteApp from "./src/roles/residente/ResidenteApp";
import AsesorApp from "./src/roles/asesor/AsesorApp";
import JefeApp from "./src/roles/jefe/JefeApp";

import { setAuthToken, loadStoredToken } from "./src/context/AuthContext";
import { API_BASE } from "./src/config/api";
import { ReportesProvider } from "./src/context/ReportesContext";
import { NotificacionesProvider } from "./src/context/NotificacionesContext";
import { ProyectosProvider } from "./src/context/ProyectosContext";
import { FotosProvider } from "./src/context/FotosContext";
import { ThemeProvider } from "./src/context/ThemeContext";
import { WebSocketProvider } from "./src/context/WebSocketContext";
import { DialogProvider } from "./src/context/DialogContext";

/** Lee ?nodo_code= (solo web) y lo borra de la dirección sin recargar. */
function readNodoCode() {
  if (Platform.OS !== "web" || typeof window === "undefined") return null;
  try {
    const url = new URL(window.location.href);
    const code = url.searchParams.get("nodo_code");
    if (!code) return null;
    url.searchParams.delete("nodo_code");
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
    return code;
  } catch {
    return null;
  }
}

export default function App() {
  // ── 1. Cargar fuentes Sora ────────────────────────────────────────────────
  const [fontsLoaded] = useFonts({
    Sora_400Regular,
    Sora_500Medium,
    Sora_600SemiBold,
    Sora_700Bold,
    Sora_800ExtraBold,
  });

  // ── Aplicar Sora globalmente ──────────────────────────────────────────────
  if (fontsLoaded) {
    if (!Text.defaultProps?._soraApplied) {
      const fontFamily = Platform.OS === "web" ? "Sora" : "Sora_400Regular";
      Text.defaultProps = {
        ...(Text.defaultProps || {}),
        style: [{ fontFamily }],
        _soraApplied: true,
      };
      TextInput.defaultProps = {
        ...(TextInput.defaultProps || {}),
        style: [{ fontFamily }],
      };
    }
  }

  // ── 2. Estado de sesión ───────────────────────────────────────────────────
  const [screen, setScreen] = useState("login");
  const [usuario, setUsuario] = useState(null);
  const [loginError, setLoginError] = useState("");
  // true mientras se revisa si hay una sesión guardada (evita mostrar el login un instante)
  const [restoring, setRestoring] = useState(true);

  const rolNormalizado = usuario?.rol?.toLowerCase();

  // Misma entrada para correo/contraseña y para la cuenta de NODO.
  function completeLogin(data) {
    setLoginError("");
    setAuthToken(data.token);
    setUsuario(data.usuario);
    try {
      localStorage.setItem(
        "vt_last_user_info",
        JSON.stringify({
          id: data.usuario.id,
          nombre: data.usuario.nombre,
          rol: data.usuario.rol,
        }),
      );
    } catch {
      /* sin localStorage */
    }
    setScreen("app");
  }

  // ── Restaurar sesión al recargar ──────────────────────────────────────────
  // Si hay un token guardado, se valida con /auth/me. Token vencido o inválido
  // (401), cuenta inactiva (403) o usuario inexistente (404) → se borra y se
  // muestra el login. Si el servidor no responde, se muestra el login pero el
  // token se conserva para el siguiente intento.
  useEffect(() => {
    let cancelled = false;
    const restore = async () => {
      try {
        // Entrada desde NODO: ?nodo_code=<código de un solo uso>. Se quita de la
        // dirección de inmediato (no debe quedar en el historial) y se canjea.
        const nodoCode = readNodoCode();
        if (nodoCode && API_BASE) {
          const res = await fetch(`${API_BASE}/auth/nodo`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: nodoCode }),
          });
          const data = await res.json().catch(() => null);
          if (cancelled) return;
          if (data?.ok) completeLogin(data);
          else setLoginError(data?.mensaje || "No pudimos entrar con tu cuenta de NODO.");
          return;
        }
        const token = await loadStoredToken();
        if (!token || !API_BASE) return;
        const res = await fetch(`${API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if ([401, 403, 404].includes(res.status)) {
          await setAuthToken(null);
          return;
        }
        const data = await res.json();
        if (!cancelled && data?.ok && data.usuario) {
          setUsuario(data.usuario);
          setScreen("app");
        }
      } catch (err) {
        console.warn("No se pudo restaurar la sesión:", err?.message || err);
      } finally {
        if (!cancelled) setRestoring(false);
      }
    };
    restore();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogin = async (email, password) => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo: email, password }),
      });
      const data = await res.json();
      if (!data.ok) {
        setLoginError(
          data.mensaje || "Credenciales incorrectas. Intenta de nuevo.",
        );
        return;
      }
      completeLogin(data);
    } catch (err) {
      setLoginError("Error de conexión. ¿El backend está corriendo?");
      console.error(err);
    }
  };

  const handleLogout = () => {
    setAuthToken(null);
    setUsuario(null);
    setLoginError("");
    setScreen("login");
  };

  // ── 3. Pantalla de carga mientras cargan fuentes o se restaura la sesión ──
  if (!fontsLoaded || restoring) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#fff",
        }}
      >
        <ActivityIndicator size="large" color="#0d9488" />
      </View>
    );
  }

  // ── 4. Árbol de providers ─────────────────────────────────────────────────
  // ProyectosProvider solo se monta para el Asesor (ver AsesorApp).
  // Aquí se mantiene en el árbol global para que el contexto esté disponible,
  // pero el fetch real solo ocurre cuando AsesorApp llama reload().
  return (
    <SafeAreaProvider>
      <WebSocketProvider usuario={usuario}>
        <ThemeProvider>
          <DialogProvider>
          <FotosProvider>
            <ProyectosProvider>
              <ReportesProvider>
                <NotificacionesProvider initialUnread={0}>
                  {screen === "login" || !usuario ? (
                    <LoginScreen
                      onLogin={handleLogin}
                      loginError={loginError}
                      onClearError={() => setLoginError("")}
                    />
                  ) : rolNormalizado === "residente" ? (
                    <ResidenteApp usuario={usuario} onLogout={handleLogout} />
                  ) : rolNormalizado === "asesor" ? (
                    <AsesorApp usuario={usuario} onLogout={handleLogout} />
                  ) : rolNormalizado === "jefe" ? (
                    <JefeApp usuario={usuario} onLogout={handleLogout} />
                  ) : (
                    <LoginScreen
                      onLogin={handleLogin}
                      loginError={loginError}
                      onClearError={() => setLoginError("")}
                    />
                  )}
                </NotificacionesProvider>
              </ReportesProvider>
            </ProyectosProvider>
          </FotosProvider>
          </DialogProvider>
        </ThemeProvider>
      </WebSocketProvider>
    </SafeAreaProvider>
  );
}
