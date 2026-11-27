/** Entrega el componente App a Expo para que pueda montarlo en la plataforma elegida. */

import { registerRootComponent } from "expo";
import App from "./App";

// Expo usa este registro para montar el mismo componente raíz en la plataforma elegida.
registerRootComponent(App);
