import { describe, expect, it } from "vitest";
import {
  getSchoolYear,
  getSchoolYearStartMonth,
  isSchoolYearDepartureMonth,
  isSummerBreak,
} from "./calendar";

describe("school calendar", () => {
  it("keeps September through August in one school year and starts a new one in September", () => {
    expect(getSchoolYear(1)).toBe(1);
    expect(getSchoolYear(8)).toBe(1);
    expect(getSchoolYear(9)).toBe(1);
    expect(getSchoolYear(18)).toBe(1);
    expect(getSchoolYear(20)).toBe(1);
    expect(getSchoolYear(21)).toBe(2);
  });

  it("marks only July and August as summer break", () => {
    expect(isSummerBreak(6)).toBe(false);
    expect(isSummerBreak(7)).toBe(true);
    expect(isSummerBreak(8)).toBe(true);
    expect(isSummerBreak(9)).toBe(false);
    expect(isSummerBreak(19)).toBe(true);
  });

  it("marks the June to July transition as the departure period", () => {
    expect(isSchoolYearDepartureMonth(6)).toBe(true);
    expect(isSchoolYearDepartureMonth(18)).toBe(true);
    expect(isSchoolYearDepartureMonth(5)).toBe(false);
    expect(isSchoolYearDepartureMonth(7)).toBe(false);
  });

  it("returns the first month of each school year", () => {
    expect(getSchoolYearStartMonth(1)).toBe(9);
    expect(getSchoolYearStartMonth(2)).toBe(21);
    expect(getSchoolYearStartMonth(3)).toBe(33);
  });
});
