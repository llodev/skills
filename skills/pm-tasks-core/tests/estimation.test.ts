import { describe, it, expect } from "vitest";
import {
  normalizeEstimate,
  snapToScale,
  type EstimationConfig,
  type NormalizeResult,
} from "../src/estimation.js";

// ---------------------------------------------------------------------------
// snapToScale
// ---------------------------------------------------------------------------

describe("snapToScale", () => {
  const fib = [1, 2, 3, 5, 8, 13];

  it("returns exact match", () => {
    expect(snapToScale(5, fib)).toBe(5);
  });

  it("snaps to nearest lower", () => {
    expect(snapToScale(6, fib)).toBe(5);
  });

  it("snaps to nearest higher", () => {
    expect(snapToScale(4.1, fib)).toBe(5);
  });

  it("tie → picks higher value", () => {
    // 4 is equidistant from 3 (dist 1) and 5 (dist 1) → 5 wins
    expect(snapToScale(4, fib)).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// point-like strategies
// ---------------------------------------------------------------------------

describe("story_points (point-like)", () => {
  const cfg = (scale?: number[]): EstimationConfig => ({
    strategy: "story_points",
    jiraTarget: "story_points",
    fieldId: "story_points",
    ...(scale ? { scale } : {}),
  });

  it("number input → points set, timeString absent", () => {
    const r = normalizeEstimate(8, cfg());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.points).toBe(8);
    expect(r.value.timeString).toBeUndefined();
    expect(r.value.humanReadable).toBe("8");
    expect(r.value.jiraTarget).toBe("story_points");
  });

  it("snaps to scale", () => {
    const r = normalizeEstimate(6, cfg([1, 2, 3, 5, 8, 13]));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.points).toBe(5); // nearest to 6 is 5
  });

  it("tie → higher value wins (4 → 5 on [1,2,3,5,8,13])", () => {
    const r = normalizeEstimate(4, cfg([1, 2, 3, 5, 8, 13]));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.points).toBe(5);
  });

  it("wrong input type → ok:false (never throws)", () => {
    const r = normalizeEstimate("eight" as unknown as number, cfg());
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/requires a number/);
  });
});

describe("fibonacci (point-like)", () => {
  it("uses raw value when no scale provided", () => {
    const r = normalizeEstimate(13, {
      strategy: "fibonacci",
      jiraTarget: "story_points",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.points).toBe(13);
  });
});

describe("planning_poker (point-like)", () => {
  it("snaps to nearest in scale", () => {
    const r = normalizeEstimate(7, {
      strategy: "planning_poker",
      jiraTarget: "story_points",
      scale: [1, 2, 3, 5, 8, 13],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.points).toBe(8); // |7-5|=2, |7-8|=1 → 8
  });
});

describe("affinity (point-like)", () => {
  it("passes through without scale", () => {
    const r = normalizeEstimate(21, {
      strategy: "affinity",
      jiraTarget: "none",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.points).toBe(21);
    expect(r.value.jiraTarget).toBe("none");
  });
});

// ---------------------------------------------------------------------------
// t_shirt
// ---------------------------------------------------------------------------

describe("t_shirt", () => {
  const cfg = (sizeMap: Record<string, number>): EstimationConfig => ({
    strategy: "t_shirt",
    jiraTarget: "story_points",
    sizeMap,
  });

  it('"M" with {M:3} → points 3, humanReadable "M"', () => {
    const r = normalizeEstimate("M", cfg({ S: 1, M: 3, L: 5, XL: 8 }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.points).toBe(3);
    expect(r.value.humanReadable).toBe("M");
    expect(r.value.timeString).toBeUndefined();
  });

  it("unknown size → ok:false", () => {
    const r = normalizeEstimate("XXL", cfg({ S: 1, M: 3 }));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/Unknown t-shirt size/);
  });

  it("wrong input type → ok:false", () => {
    const r = normalizeEstimate(5 as unknown as string, cfg({ S: 1 }));
    expect(r.ok).toBe(false);
  });

  it("missing sizeMap → ok:false", () => {
    const r = normalizeEstimate("M", {
      strategy: "t_shirt",
      jiraTarget: "story_points",
    });
    expect(r.ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// three_point
// ---------------------------------------------------------------------------

describe("three_point", () => {
  it("PERT formula: (1+4·3+8)/6 = 3.5; no scale → rounds to 4", () => {
    const r = normalizeEstimate(
      { optimistic: 1, likely: 3, pessimistic: 8 },
      { strategy: "three_point", jiraTarget: "story_points" },
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.points).toBe(4); // Math.round(3.5) = 4 in JS
    expect(r.value.humanReadable).toBe("o=1, m=3, p=8");
  });

  it("PERT 3.5 with scale [1,2,3,5,8,13] → snaps to 3 (nearest)", () => {
    const r = normalizeEstimate(
      { optimistic: 1, likely: 3, pessimistic: 8 },
      { strategy: "three_point", jiraTarget: "story_points", scale: [1, 2, 3, 5, 8, 13] },
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.points).toBe(3); // |3.5-3|=0.5 < |3.5-5|=1.5
  });

  it("wrong input type → ok:false", () => {
    const r = normalizeEstimate(5 as unknown as object, {
      strategy: "three_point",
      jiraTarget: "story_points",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/ThreePointEstimate/);
  });

  it("timeString is absent", () => {
    const r = normalizeEstimate(
      { optimistic: 2, likely: 4, pessimistic: 6 },
      { strategy: "three_point", jiraTarget: "story_points" },
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.timeString).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// ideal_days
// ---------------------------------------------------------------------------

describe("ideal_days", () => {
  it("produces correct timeString and humanReadable", () => {
    const r = normalizeEstimate(3, {
      strategy: "ideal_days",
      jiraTarget: "time",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.timeString).toBe("3d");
    expect(r.value.humanReadable).toBe("3 ideal days");
    expect(r.value.points).toBeUndefined();
  });

  it("wrong input type → ok:false", () => {
    const r = normalizeEstimate("three" as unknown as number, {
      strategy: "ideal_days",
      jiraTarget: "time",
    });
    expect(r.ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ideal_hours
// ---------------------------------------------------------------------------

describe("ideal_hours", () => {
  it("produces correct timeString and humanReadable", () => {
    const r = normalizeEstimate(4, {
      strategy: "ideal_hours",
      jiraTarget: "time",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.timeString).toBe("4h");
    expect(r.value.humanReadable).toBe("4 ideal hours");
    expect(r.value.points).toBeUndefined();
  });

  it("wrong input type → ok:false", () => {
    const r = normalizeEstimate("4h" as unknown as number, {
      strategy: "ideal_hours",
      jiraTarget: "time",
    });
    expect(r.ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// jiraTarget independence
// ---------------------------------------------------------------------------

describe("jiraTarget independence", () => {
  it('jiraTarget "none" → still computes points, jiraTarget="none"', () => {
    const r = normalizeEstimate(5, {
      strategy: "story_points",
      jiraTarget: "none",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.points).toBe(5);
    expect(r.value.jiraTarget).toBe("none");
  });

  it('jiraTarget "none" with ideal_days → timeString still set', () => {
    const r = normalizeEstimate(2, {
      strategy: "ideal_days",
      jiraTarget: "none",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.timeString).toBe("2d");
    expect(r.value.jiraTarget).toBe("none");
  });
});

// ---------------------------------------------------------------------------
// Result contract — never throws
// ---------------------------------------------------------------------------

describe("normalizeEstimate never throws", () => {
  it("bad input returns ok:false, does not throw", () => {
    let result: NormalizeResult | undefined;
    expect(() => {
      result = normalizeEstimate(null as unknown as number, {
        strategy: "story_points",
        jiraTarget: "story_points",
      });
    }).not.toThrow();
    expect(result?.ok).toBe(false);
  });

  it("missing sizeMap for t_shirt returns ok:false, does not throw", () => {
    let result: NormalizeResult | undefined;
    expect(() => {
      result = normalizeEstimate("XL", {
        strategy: "t_shirt",
        jiraTarget: "story_points",
      });
    }).not.toThrow();
    expect(result?.ok).toBe(false);
  });

  it("unknown strategy hits the exhaustive guard → ok:false", () => {
    const result = normalizeEstimate(5, {
      strategy: "bogus" as unknown as EstimationConfig["strategy"],
      jiraTarget: "none",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/Unknown strategy/);
  });

  it("an internal throw is caught and returned as ok:false (never throws)", () => {
    let result: NormalizeResult | undefined;
    expect(() => {
      // A non-iterable `scale` makes snapToScale throw inside the try block,
      // exercising the catch → { ok: false, error }.
      result = normalizeEstimate(5, {
        strategy: "story_points",
        jiraTarget: "none",
        scale: 123 as unknown as number[],
      });
    }).not.toThrow();
    expect(result?.ok).toBe(false);
  });
});
