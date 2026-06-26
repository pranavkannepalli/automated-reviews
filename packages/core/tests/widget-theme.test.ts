import { describe, expect, test } from "vitest";

import { parseWidgetThemeForTest } from "../src/widget-theme";

describe("parseWidgetThemeForTest", () => {
  test("applies defaults when params are missing", () => {
    const theme = parseWidgetThemeForTest({});
    expect(theme.layout).toBe("carousel");
    expect(theme.radius).toBe(28);
    expect(theme.autoplay).toBe(true);
  });

  test("clamps interval and radius and respects booleans", () => {
    const theme = parseWidgetThemeForTest({
      layout: "grid",
      radius: "999",
      autoplay: "0",
      intervalMs: "1",
    });

    expect(theme.layout).toBe("grid");
    expect(theme.radius).toBe(48);
    expect(theme.autoplay).toBe(false);
    expect(theme.intervalMs).toBe(2500);
  });
});
