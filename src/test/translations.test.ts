import { describe, it, expect } from "vitest";
import { translations, translate, DEFAULT_LANG } from "@/i18n/translations";

describe("translations", () => {
  it("defaults to Uzbek", () => {
    expect(DEFAULT_LANG).toBe("uz");
  });
  it("ru and en have every uz key", () => {
    const keys = Object.keys(translations.uz).sort();
    expect(Object.keys(translations.ru).sort()).toEqual(keys);
    expect(Object.keys(translations.en).sort()).toEqual(keys);
  });
  it("interpolates parent names", () => {
    expect(translate("en", "challengeQuestion", { father: "Karim", mother: "Dilnoza" })).toBe(
      "Are you the child of Karim and Dilnoza?",
    );
  });
});
