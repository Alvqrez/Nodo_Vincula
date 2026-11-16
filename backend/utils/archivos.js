/**
 * Validación de documentos subidos como base64 (mismo criterio que los reportes
 * en routes/residente.js): extensión permitida + firma real del archivo
 * (magic bytes) + tamaño máximo.
 */
const path = require("path");

const TAMANO_MAXIMO = 10 * 1024 * 1024; // 10 MB

const MIME_POR_EXTENSION = {
  ".pdf": "application/pdf",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

const EXTENSIONES_DOCUMENTO = Object.keys(MIME_POR_EXTENSION);

function extensionDe(nombreArchivo) {
  return path.extname(String(nombreArchivo || "")).toLowerCase();
}

// PDF empieza con %PDF (25 50 44 46); DOCX es un ZIP y empieza con PK\x03\x04.
function firmaCoincide(buffer, extension) {
  if (!buffer || buffer.length < 4) return false;
  if (extension === ".pdf") {
    return (
      buffer[0] === 0x25 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x44 &&
      buffer[3] === 0x46
    );
  }
  if (extension === ".docx") {
    return (
      buffer[0] === 0x50 &&
      buffer[1] === 0x4b &&
      buffer[2] === 0x03 &&
      buffer[3] === 0x04
    );
  }
  return false;
}

function decodificarBase64(archivo) {
  const texto = String(archivo || "");
  const datos = texto.includes(",") ? texto.split(",")[1] : texto;
  return Buffer.from(datos, "base64");
}

function formatoMegas(bytes) {
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

/**
 * Valida un documento recibido como data URI o base64.
 * Devuelve { ok: true, buffer, extension, mime } o { ok: false, mensaje }.
 */
function validarDocumento({
  archivo,
  nombreArchivo,
  extensiones = EXTENSIONES_DOCUMENTO,
  tamanoMaximo = TAMANO_MAXIMO,
}) {
  if (!archivo || !nombreArchivo) {
    return { ok: false, mensaje: "Selecciona un archivo para subir." };
  }

  const extension = extensionDe(nombreArchivo);
  if (!extensiones.includes(extension)) {
    return {
      ok: false,
      mensaje: `Tipo de archivo no permitido. Solo se aceptan: ${extensiones.join(", ")}`,
    };
  }

  const buffer = decodificarBase64(archivo);
  if (!buffer.length) {
    return { ok: false, mensaje: "El archivo está vacío." };
  }
  if (buffer.length > tamanoMaximo) {
    return {
      ok: false,
      mensaje: `El archivo excede el tamaño máximo permitido (${formatoMegas(tamanoMaximo)}).`,
    };
  }
  if (!firmaCoincide(buffer, extension)) {
    return {
      ok: false,
      mensaje:
        "El contenido del archivo no corresponde a su extensión. Archivo rechazado.",
    };
  }

  return {
    ok: true,
    buffer,
    extension,
    mime: MIME_POR_EXTENSION[extension] || "application/octet-stream",
  };
}

module.exports = {
  TAMANO_MAXIMO,
  EXTENSIONES_DOCUMENTO,
  MIME_POR_EXTENSION,
  extensionDe,
  firmaCoincide,
  decodificarBase64,
  validarDocumento,
};
