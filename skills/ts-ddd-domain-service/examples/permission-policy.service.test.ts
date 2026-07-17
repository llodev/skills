/**
 * Domain Service test template — standalone, no mocks, no DI.
 * Mirrors the api test style under `apps/api/test/<bc>/domain/services/`.
 * Run via `pnpm --filter api test`.
 */
import { Celebration } from "@celebrations/domain/entities/celebration.entity";
import { CelebrationStatusEnum, SectionKindEnum } from "@acme/celebrations-contracts";
import { CelebrationPublishingPolicy } from "./permission-policy.service";

function buildCelebration(
  overrides: Partial<Parameters<typeof Celebration.create>[0]> = {},
): Celebration {
  return Celebration.create({
    id: "celeb-1",
    slug: "ana-25",
    kind: "birthday",
    palette: "rose",
    title: "Ana 25",
    status: CelebrationStatusEnum.DRAFT,
    sections: [{ id: "s-1", order: 0, content: { type: SectionKindEnum.HERO, title: "Hi" } }],
    ...overrides,
  });
}

describe("CelebrationPublishingPolicy.check", () => {
  it("passes for a draft celebration with a hero section and a title", () => {
    const result = CelebrationPublishingPolicy.check(buildCelebration());
    expect(result.isOk).toBe(true);
  });

  it("fails when the celebration is already published", () => {
    const result = CelebrationPublishingPolicy.check(
      buildCelebration({ status: CelebrationStatusEnum.PUBLISHED }),
    );
    expect(result.isFailure).toBe(true);
    expect(result.errors).toEqual(expect.arrayContaining(["ALREADY_PUBLISHED"]));
  });

  it("fails when there are no sections at all", () => {
    const result = CelebrationPublishingPolicy.check(buildCelebration({ sections: [] }));
    expect(result.isFailure).toBe(true);
    expect(result.errors).toEqual(expect.arrayContaining(["NO_SECTIONS"]));
  });

  it("fails when no hero section is present", () => {
    const result = CelebrationPublishingPolicy.check(
      buildCelebration({
        sections: [{ id: "s-1", order: 0, content: { type: SectionKindEnum.GALLERY, images: [] } }],
      }),
    );
    expect(result.isFailure).toBe(true);
    expect(result.errors).toEqual(expect.arrayContaining(["MISSING_HERO_SECTION"]));
  });

  it("aggregates every failure reason at once", () => {
    const result = CelebrationPublishingPolicy.check(
      buildCelebration({
        status: CelebrationStatusEnum.PUBLISHED,
        sections: [],
      }),
    );
    expect(result.isFailure).toBe(true);
    expect(result.errors).toEqual(expect.arrayContaining(["ALREADY_PUBLISHED", "NO_SECTIONS"]));
  });

  it("is deterministic — same celebration produces the same outcome twice", () => {
    const celebration = buildCelebration();
    const a = CelebrationPublishingPolicy.check(celebration);
    const b = CelebrationPublishingPolicy.check(celebration);
    expect(a.isOk).toBe(b.isOk);
  });
});
