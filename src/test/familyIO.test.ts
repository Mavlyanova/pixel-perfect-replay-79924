import { describe, it, expect } from "vitest";
import { buildBirthdayIcs, daysUntilBirthday, parseCsv, rowsToPeople, sheetCsvUrl } from "@/lib/familyIO";
describe("familyIO", () => {
  it("counts days to next birthday", () => {
    expect(daysUntilBirthday("1995-05-20", new Date(2026, 4, 10))).toBe(10);
    expect(daysUntilBirthday("1995-05-01", new Date(2026, 4, 10))).toBe(356);
  });
  it("ics skips deceased and recurs yearly", () => {
    const ics = buildBirthdayIcs([
      { id: "a", fullName: "A", birthDate: "1990-01-02", gender: "male", claimedBy: null },
      { id: "b", fullName: "B", birthDate: "1900-01-02", deathDate: "1950-01-01", gender: "male", claimedBy: null },
    ]);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1);
    expect(ics).toContain("RRULE:FREQ=YEARLY");
  });
  it("parses sheet rows", () => {
    const r = rowsToPeople(parseCsv('Full Name,Gender,Birth Date,Parent Name\n"Ali, Jr",female,2000-01-01,Olim\n'));
    expect(r[0]).toMatchObject({ fullName: "Ali, Jr", gender: "female", parentName: "Olim" });
  });
  it("converts sheet links", () => {
    expect(sheetCsvUrl("https://docs.google.com/spreadsheets/d/abc/edit#gid=5")).toBe("https://docs.google.com/spreadsheets/d/abc/export?format=csv&gid=5");
  });
});
