import { describe, it, expect } from "@jest/globals";
import { t, defaultLocale, messages } from "../../../src/i18n/messages.js";

describe("i18n/messages", () => {
  it("returns the spanish translation by default", () => {
    expect(defaultLocale()).toBe("es");
    expect(t("init.detecting", "es")).toBe("🔍 Detectando stack...");
  });

  it("returns the english translation when requested", () => {
    expect(t("init.detecting", "en")).toBe("🔍 Detecting stack...");
  });

  it("interpolates variables", () => {
    expect(t("validate.success", "es", { feature: "header", phase: "impl" })).toBe(
      'Feature "header" válido (fase: impl)',
    );
  });

  it("falls back to the key when translation is missing", () => {
    expect(t("unknown.key", "es")).toBe("unknown.key");
  });

  it("falls back to spanish when locale is unknown", () => {
    expect(t("init.detecting", "fr" as unknown as "es")).toBe(
      "🔍 Detectando stack...",
    );
  });
});
