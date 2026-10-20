const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const maximumLengths = { name: 120, email: 254, message: 5000 };

function sendJson(response, status, body) {
  response.status(status).json(body);
}

module.exports = async function handler(request, response) {
  response.setHeader("Cache-Control", "no-store");

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return sendJson(response, 405, { error: "Método no permitido." });
  }

  const origin = request.headers.origin;
  const host = String(request.headers["x-forwarded-host"] || request.headers.host || "")
    .split(",")[0]
    .trim();
  const protocol = String(
    request.headers["x-forwarded-proto"] || (request.socket && request.socket.encrypted ? "https" : "http")
  ).split(",")[0].trim();
  let originIsAllowed = false;

  try {
    originIsAllowed = Boolean(origin && host && new URL(origin).origin === `${protocol}://${host}`);
  } catch {
    originIsAllowed = false;
  }

  if (!originIsAllowed) {
    return sendJson(response, 403, { error: "No se pudo verificar el origen de la solicitud." });
  }

  if (!String(request.headers["content-type"] || "").toLowerCase().startsWith("application/json")) {
    return sendJson(response, 415, { error: "El formulario debe enviarse como JSON." });
  }

  const contentLength = Number(request.headers["content-length"] || 0);
  if (contentLength > 12_000) {
    return sendJson(response, 413, { error: "El mensaje supera el tamaño permitido." });
  }

  if (!process.env.RESEND_API_KEY || !process.env.CONTACT_FROM_EMAIL || !process.env.CONTACT_TO_EMAIL) {
    console.error("Falta configurar RESEND_API_KEY, CONTACT_FROM_EMAIL o CONTACT_TO_EMAIL.");
    return sendJson(response, 503, { error: "El envío no está disponible por el momento. Intentá más tarde." });
  }

  let fields = request.body;
  if (typeof fields === "string") {
    try {
      fields = JSON.parse(fields);
    } catch {
      return sendJson(response, 400, { error: "No se pudo leer el formulario." });
    }
  }

  if (!fields || typeof fields !== "object" || Array.isArray(fields)) {
    return sendJson(response, 400, { error: "No se pudo leer el formulario." });
  }

  if (typeof fields.website === "string" && fields.website.trim()) {
    return sendJson(response, 400, { error: "No se pudo validar el formulario." });
  }

  const name = typeof fields.name === "string" ? fields.name.trim() : "";
  const email = typeof fields.email === "string" ? fields.email.trim() : "";
  const message = typeof fields.message === "string" ? fields.message.trim() : "";

  if (!name || name.length > maximumLengths.name) {
    return sendJson(response, 400, { error: "Ingresá tu nombre (hasta 120 caracteres)." });
  }
  if (!email || email.length > maximumLengths.email || !emailPattern.test(email)) {
    return sendJson(response, 400, { error: "Ingresá un correo electrónico válido." });
  }
  if (!message || message.length > maximumLengths.message) {
    return sendJson(response, 400, { error: "El mensaje debe tener entre 1 y 5000 caracteres." });
  }

  const safeName = name.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim();
  if (!safeName) {
    return sendJson(response, 400, { error: "Ingresá tu nombre (hasta 120 caracteres)." });
  }
  const requestBody = {
    from: process.env.CONTACT_FROM_EMAIL,
    to: [process.env.CONTACT_TO_EMAIL],
    reply_to: email,
    subject: `Mensaje desde Tripas de achilata: ${safeName}`,
    text: `Nombre: ${safeName}\nCorreo electrónico: ${email}\n\nMensaje:\n${message}`
  };

  let resendResponse;
  try {
    resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });
  } catch (error) {
    console.error("No se pudo conectar con Resend.", error);
    return sendJson(response, 502, { error: "No se pudo enviar el mensaje. Intentá de nuevo más tarde." });
  }

  if (!resendResponse.ok) {
    const resendError = await resendResponse.json().catch(() => null);
    const errorMessage = typeof resendError?.message === "string"
      ? resendError.message.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email oculto]").slice(0, 300)
      : "Resend no proporcionó detalles.";
    console.error("Resend rechazó el envío.", {
      status: resendResponse.status,
      name: typeof resendError?.name === "string" ? resendError.name : "unknown_error",
      message: errorMessage
    });
    return sendJson(response, 502, { error: "No se pudo enviar el mensaje. Revisá los datos e intentá más tarde." });
  }

  return sendJson(response, 200, {
    message: "Muchas gracias por tu consulta. Nos contactaremos a la brevedad. Tus sugerencias son importantes para nosotros."
  });
};
