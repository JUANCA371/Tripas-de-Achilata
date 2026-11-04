function publicSupabaseKey(value) {
  if (typeof value !== "string" || !value) return "";
  if (value.startsWith("sb_publishable_")) return value;

  const payload = value.split(".")[1];
  if (!payload) return "";
  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return claims.role === "anon" ? value : "";
  } catch {
    return "";
  }
}

module.exports = function handler(request, response) {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Content-Type", "application/javascript; charset=utf-8");
  response.setHeader("X-Content-Type-Options", "nosniff");

  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    response.status(405).send("window.AULA_CONFIG = {};");
    return;
  }

  let supabaseUrl = "";
  try {
    const configuredUrl = new URL(process.env.SUPABASE_URL || "");
    if (configuredUrl.protocol === "https:" || ["localhost", "127.0.0.1"].includes(configuredUrl.hostname)) {
      supabaseUrl = configuredUrl.origin;
    }
  } catch {
    supabaseUrl = "";
  }
  const supabaseAnonKey = publicSupabaseKey(process.env.SUPABASE_ANON_KEY);
  const configurationError = process.env.SUPABASE_ANON_KEY && !supabaseAnonKey
    ? "Configuración bloqueada: usa únicamente la clave publicable o anon de Supabase, nunca service_role."
    : "";
  response.status(200).send(
    `window.AULA_CONFIG = ${JSON.stringify({ supabaseUrl, supabaseAnonKey, configurationError })};`
  );
};
