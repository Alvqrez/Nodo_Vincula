# Nodo Vincula

Aplicación de seguimiento de residencias profesionales del Instituto Tecnológico de Veracruz. El residente entrega reportes y consulta su avance. El asesor revisa las entregas de sus residentes asignados. Vinculación gestiona empresas, proyectos y asignaciones.

## Ver la demo

En PowerShell, desde la raíz del repositorio:

```powershell
cd .\web
npm.cmd ci
npm.cmd run dev -- --host 127.0.0.1
```

Abre la dirección que Vite muestra en `Local:` y añade `/prototipo/residente`. Puedes explorar «Mi residencia» y cambiar de escenario con datos ficticios. La demo funciona sin iniciar sesión ni configurar MySQL.

## Mapa del proyecto

| Ruta | Qué contiene |
| --- | --- |
| [web/](web/) | Cliente web con React, TypeScript y Vite. La pantalla «Mi residencia» destaca el siguiente paso del expediente. |
| [App.js](App.js) y [src/](src/) | Cliente React Native con Expo 54. Incluye las vistas operativas de asesor y Vinculación. |
| [backend/](backend/) | API Express, avisos mediante Socket.IO y conexión a MySQL con `mysql2`. |
| [backend/schema.sql](backend/schema.sql) y [backend/migrations/](backend/migrations/) | Esquema inicial y cambios incrementales de la base. |

La web tiene pantallas para entregas y seguimiento del residente, además de calendario, perfil y avisos. Los módulos principales de asesor y Vinculación siguen en rediseño en la web. Para probar esas operaciones, abre el cliente Expo.

## Cómo leer el código

### Empieza por la acción que quieres entender

| Acción | Flujo de lectura |
| --- | --- |
| Abrir la web | [web/index.html](web/index.html) → [main.tsx](web/src/main.tsx) → [App.tsx](web/src/App.tsx) → [AppRoutes.tsx](web/src/app/AppRoutes.tsx) |
| Abrir Expo | [index.js](index.js) → [App.js](App.js) → [vistas por rol](src/roles/) |
| Entrar con una cuenta en la web | [Acceso.tsx](web/src/app/Acceso.tsx) → [sesión web](web/src/lib/session.tsx) → [ruta de autenticación](backend/routes/auth.js) |
| Entregar un reporte | [folio y selector de archivo](web/src/pantallas/residente/piezas.tsx) → [datos del expediente](web/src/pantallas/residente/reportes.tsx) → [ruta del residente](backend/routes/residente.js) |
| Abrir un reporte | [cliente de archivos](web/src/lib/api.ts) → [descarga autorizada](backend/routes/descargas.js) → [conexión a MySQL](backend/db.js) y archivo guardado |
| Recibir un aviso | [sesión de Socket.IO](backend/utils/socketSesion.js) → [notificación persistente](backend/utils/notificacionPersistente.js) → [avisos en la web](web/src/lib/notificaciones.tsx) |

En la descarga, fíjate en las dos preguntas que hace el servidor. Primero valida la sesión para saber quién pide el archivo. Después consulta el expediente para comprobar si esa persona puede abrir ese reporte. Los comentarios al inicio de los archivos y junto a estos bloques sirven como puntos de referencia durante la lectura.

### Dónde buscar dentro de cada cliente

- **Expo** · [components/](src/components/) contiene las piezas reutilizables. [screens/](src/screens/) contiene pantallas completas. [roles/](src/roles/) organiza la navegación por cuenta. [context/](src/context/) comparte datos como la sesión y los reportes. [mobile/](src/mobile/) agrupa la adaptación para pantallas pequeñas.
- **Web Vite** · [app/](web/src/app/) contiene el acceso, la navegación y las rutas autenticadas. [pantallas/](web/src/pantallas/) contiene las vistas. [lib/](web/src/lib/) reúne las peticiones y los datos compartidos. [landing/](web/src/landing/) es la portada y [prototipo/](web/src/prototipo/) es la demo con datos ficticios.
- **Servidor** · [routes/](backend/routes/) define las operaciones HTTP. [middleware.js](backend/middleware.js) verifica sesión y rol. [middleware/](backend/middleware/) valida datos de entrada. [utils/](backend/utils/) comparte reglas y operaciones entre rutas. [test/](backend/test/) verifica comportamientos con datos simulados.
- **Datos** · [schema.sql](backend/schema.sql) define las tablas iniciales. [migrations/](backend/migrations/) actualiza bases que ya existen. [seed.js](backend/seed.js) y [seedVacia.js](backend/seedVacia.js) cargan datos ficticios en una base preparada.

### Configuración y carpetas locales

| Archivo o carpeta | Papel en el proyecto |
| --- | --- |
| `package.json` y `package-lock.json` | Cada paquete declara sus comandos y dependencias en el primero. npm mantiene las versiones exactas en el segundo. Hay un par en la raíz, otro en `backend/` y otro en `web/`. |
| `app.json` y `recursos_visuales/` | Expo lee en `app.json` los nombres y rutas del icono, la imagen de arranque y el favicon. Los archivos de imagen viven en `recursos_visuales/`. |
| `babel.config.js` | Configura la transformación de Expo y la lectura de las variables permitidas a través de `@env`. |
| `tsconfig.json` y `web/tsconfig.json` | La raíz hereda la configuración de Expo. La web define su revisión estricta y el alcance de archivos de TypeScript. |
| `public/` y `web/public/` | La primera contiene el HTML de Expo Web. La segunda contiene recursos públicos de la web Vite. |
| `node_modules/`, `logs/` y `backend/uploads/` | Contienen dependencias instaladas, registros del servidor y archivos subidos. Se generan o se llenan durante la instalación y el uso. |
| `.gitignore` | Define qué archivos locales quedan fuera de Git, como variables de entorno, dependencias, logs y reportes subidos. |

## Ejecutar el flujo completo

Usa Node.js compatible con Expo 54 y MySQL 8.0. Prepara una instancia aislada de MySQL con datos ficticios. **El esquema inicial ejecuta `DROP DATABASE IF EXISTS vinculatec`.** Úsalo únicamente para preparar una instancia de prueba vacía.

1. En `backend/.env`, configura la conexión y un secreto exclusivo de tu entorno:

   ```dotenv
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=usuario_local
   DB_PASSWORD=contraseña_local
   DB_NAME=vinculatec
   JWT_SECRET=secreto_local_largo_y_aleatorio
   PORT=3001
   NODE_ENV=development
   ```

2. Desde `backend`, importa el esquema con una cuenta que pueda crear la base de laboratorio. Este comando se ejecuta en PowerShell y pide la contraseña de MySQL:

   ```powershell
   mysql -u root -p -e "source schema.sql"
   ```

   Ejecuta `npm.cmd ci` y luego `node seedVacia.js` una sola vez en esa base vacía para crear las cuentas ficticias. El encabezado de [seedVacia.js](backend/seedVacia.js) identifica las cuentas de laboratorio.

3. Desde `backend`, ejecuta `npm.cmd start`. En otra terminal, `Invoke-RestMethod http://localhost:3001/api/health` comprueba que Express responde. Inicia sesión y guarda una entrega de prueba para comprobar también la conexión a MySQL.

4. Para el residente, inicia Vite y abre `/acceso`. El cliente web apunta a `http://localhost:3001` en local. Para usar otro servidor, configura `VITE_API_URL` en `web/.env.local` con la URL base de la API.

5. Para las operaciones de asesor y Vinculación, configura `REACT_APP_API_URL=http://localhost:3001/api` en el `.env.local` de la raíz. Desde ahí, ejecuta `npm.cmd ci` y `npm.cmd run web` para abrir el cliente Expo en el navegador.

### Acceso mediante NODO

La integración usa un código de un solo uso, que el backend canjea servidor a servidor. Configura `NODO_REDEEM_URL` y `VINCULA_SHARED_SECRET` en `backend/.env`. `NODO_INSTITUTION_ID` toma el valor `tecmx` por defecto. El residente debe estar registrado en Nodo Vincula. El acceso local con correo y contraseña está disponible sin esta integración.

### Migraciones

Para una base existente usa el ejecutor de migraciones desde `backend`:

```powershell
node migrations/run.js migrations/20261121_01_horas_residencia.sql
```

Esta migración cambia a **500 horas** el valor predeterminado para las altas futuras. Los valores guardados se conservan. Revisa los expedientes existentes de 480 horas con la institución antes de modificarlos.

## Seguimiento y acreditación

La pantalla Seguimiento reúne los requisitos de inicio, la duración y la referencia al registro de la calificación oficial. Los estados de la app describen el expediente y sus entregas. La guía institucional aplicable a cada periodo define los formatos, las evaluaciones y el cierre. [Manual del TecNM, capítulo 12](https://regionllanos.tecnm.mx/archivos/Manual_de_Lineamientos_TecNM.pdf#page=85) · [Normateca del ITVER](https://www.veracruz.tecnm.mx/index.php/component/content/category/12-normateca)

## Archivos, permisos y avisos

- Las descargas de reportes verifican la cuenta activa y su acceso al expediente. Se permiten al residente titular, al asesor asignado y al rol de Jefatura de Vinculación.
- Las fotos de perfil se pueden consultar desde la propia cuenta o desde la cuenta del asesor asignado al residente.
- Socket.IO valida la sesión y asigna las salas en el servidor. Cierra la conexión cuando vence el token. El cliente web envía el token de descarga únicamente al origen de la API.
- Los reportes admiten PDF y DOCX de hasta 10 MB. El backend valida la extensión y la firma inicial. Si falla el registro antes de confirmar la transacción, intenta limpiar el archivo nuevo.
- Git excluye archivos de entorno, documentos subidos y logs locales. Para producción, configura los orígenes permitidos en `CORS_ORIGINS`.

## Verificar cambios

Desde la raíz, con las dependencias del backend instaladas:

```powershell
node --test backend/test/acceso.test.js
```

Desde `web`, ejecuta `npm.cmd run build`. Las pruebas automatizadas usan una base simulada. Para validar todo el circuito, usa MySQL de prueba y recorre entrega, descarga, corrección y reenvío con cuentas ficticias de cada rol.

Proyecto de uso académico interno del Departamento de Sistemas del TecNM. Pulido editorial con [Unslop, de Damir Sokolovsky](https://heydamir.design/unslop).
