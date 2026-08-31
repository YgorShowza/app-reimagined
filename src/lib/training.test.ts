import { describe, expect, test } from "bun:test";
import { computeTrainingWindow } from "./training";

describe("training cycle calculation", () => {
  test("marks a cycle without prior training as expired", () => {
    expect(computeTrainingWindow(null, 90)).toEqual({
      window_start: null,
      window_end: null,
      status: "Vencido",
    });
  });

  test("calculates the renewal window from the cycle length", () => {
    const result = computeTrainingWindow("2099-01-01", 90);
    expect(result.window_end).toBe("2099-04-01");
    expect(result.window_start).toBe("2099-03-14");
    expect(result.status).toBe("Em dia");
  });

  test("marks very old training as expired", () => {
    const result = computeTrainingWindow("2000-01-01", 90);
    expect(result.status).toBe("Vencido");
  });
});
