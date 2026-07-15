import type { Locale, Messages } from "./types.js";

export const messages: Messages = {
  es: {
    "init.detecting": "🔍 Detectando stack...",
    "init.success": "Proyecto inicializado en {{path}}",
    "plan.success": "Feature \"{{feature}}\" planificado",
    "validate.success": "Feature \"{{feature}}\" válido (fase: {{phase}})",
    "validate.failure": "La validación de \"{{feature}}\" (fase: {{phase}}) falló",
    "error.notInitialized": "El proyecto no está inicializado. Ejecutá: sdd init",
    "error.featureNotFound": "El feature \"{{feature}}\" no existe",
  },
  en: {
    "init.detecting": "🔍 Detecting stack...",
    "init.success": "Project initialized at {{path}}",
    "plan.success": "Feature \"{{feature}}\" planned",
    "validate.success": "Feature \"{{feature}}\" is valid (phase: {{phase}})",
    "validate.failure": "Validation of \"{{feature}}\" (phase: {{phase}}) failed",
    "error.notInitialized": "Project is not initialized. Run: sdd init",
    "error.featureNotFound": "Feature \"{{feature}}\" does not exist",
  },
};

export function t(
  key: string,
  locale: Locale,
  vars?: Record<string, string>,
): string {
  const catalog = messages[locale] ?? messages.es;
  let text = catalog[key] ?? key;
  if (vars) {
    for (const [varKey, value] of Object.entries(vars)) {
      text = text.replace(new RegExp(`\\{\\{${varKey}\\}\\}`, "g"), value);
    }
  }
  return text;
}

export function defaultLocale(): Locale {
  return "es";
}
