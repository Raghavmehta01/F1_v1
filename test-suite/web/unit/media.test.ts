import { describe, expect, it } from "vitest";
import {
  cloudinaryDriverPortrait,
  cloudinaryTeamCar,
  cloudinaryTeamLogo,
  driverRefFromHeadshot,
  fullDriverImage,
  mediaFromStanding,
  teamSlugFromConstructorId,
  teamSlugFromName,
} from "@/lib/media";

describe("feature: F1 media / Cloudinary helpers", () => {
  it("maps team names and constructor ids to Cloudinary slugs", () => {
    expect(teamSlugFromName("Red Bull Racing")).toBe("redbullracing");
    expect(teamSlugFromName("Kick Sauber")).toBe("audi");
    expect(teamSlugFromConstructorId("red_bull")).toBe("redbullracing");
    expect(teamSlugFromConstructorId("sauber")).toBe("audi");
  });

  it("extracts driver refs from OpenF1 DAM headshots", () => {
    expect(
      driverRefFromHeadshot(
        "https://media.formula1.com/.../LANNOR01_Lando_Norris.png",
      ),
    ).toBe("lannor01");
    expect(driverRefFromHeadshot(null)).toBeNull();
  });

  it("builds 2026 portrait URLs for catalog drivers", () => {
    const url = cloudinaryDriverPortrait({
      name_acronym: "OCO",
      constructorId: "haas",
    });
    expect(url).toContain("media.formula1.com/image/upload");
    expect(url).toContain("/haas/");
    expect(url).toContain("estoco01");
  });

  it("prefers local logos for known constructors", () => {
    expect(
      cloudinaryTeamLogo({ constructorId: "mercedes", variant: "white" }),
    ).toBe("/logos/mercedes-w.webp");
    expect(
      cloudinaryTeamLogo({ constructorId: "ferrari", variant: "color" }),
    ).toBe("/logos/ferrari-c.webp");
  });

  it("builds team car URLs", () => {
    const car = cloudinaryTeamCar({ constructorId: "mclaren", width: 900 });
    expect(car).toContain("mclaren");
    expect(car).toContain("carright.webp");
  });

  it("mediaFromStanding merges OpenF1 + Jolpica fields", () => {
    const m = mediaFromStanding({
      code: "NOR",
      driverId: "norris",
      constructorId: "mclaren",
      constructorName: "McLaren",
    });
    expect(m.name_acronym).toBe("NOR");
    expect(m.constructorId).toBe("mclaren");
  });

  it("fullDriverImage returns Cloudinary when possible", () => {
    const img = fullDriverImage({
      name_acronym: "TSU",
      team_name: "Racing Bulls",
    });
    expect(img).toContain("racingbulls");
  });
});
