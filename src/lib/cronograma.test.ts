import { describe, expect, test } from "bun:test";
import {
  annualSummary,
  cronogramaMetrics,
  formatDate,
  shiftMonth,
  type CronogramaEntry,
} from "./cronograma";

function entry(overrides: Partial<CronogramaEntry> = {}): CronogramaEntry {
  return {
    id: crypto.randomUUID(),
    month: "2026-08",
    employee_id: crypto.randomUUID(),
    employee_name: "Operador Teste",
    employee_matricula: "001",
    employee_sector: "Vigilância",
    theme: "Procedimento operacional",
    exam_id: null,
    exam_title: null,
    type: "Planejado",
    status: "Pendente",
    justification: null,
    planned_date: "2026-08-10",
    completion_date: null,
    notes: null,
    question_bank_ids: [],
    created_by: null,
    created_at: "2026-08-01T00:00:00Z",
    updated_at: "2026-08-01T00:00:00Z",
    ...overrides,
  };
}

describe("cronograma date helpers", () => {
  test("moves across year boundaries", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
  });

  test("formats ISO dates without timezone drift", () => {
    expect(formatDate("2026-08-31")).toBe("31/08/2026");
    expect(formatDate(null)).toBe("—");
  });
});

describe("cronograma metrics", () => {
  test("calculates totals and execution percentage", () => {
    const rows = [
      entry({ status: "Realizado", type: "Realizado" }),
      entry({ status: "Pendente" }),
      entry({ status: "Justificado", justification: "Férias" }),
      entry({ status: "Realizado", type: "Realizado" }),
    ];

    expect(cronogramaMetrics(rows)).toEqual({
      total: 4,
      realizado: 2,
      pendente: 1,
      justificado: 1,
      executionRate: 50,
    });
  });

  test("returns zero execution for an empty month", () => {
    expect(cronogramaMetrics([])).toEqual({
      total: 0,
      realizado: 0,
      pendente: 0,
      justificado: 0,
      executionRate: 0,
    });
  });
});

describe("annual summary", () => {
  test("always returns twelve months and isolates each month", () => {
    const rows = [
      entry({ month: "2026-01", status: "Realizado", type: "Realizado" }),
      entry({ month: "2026-01", status: "Pendente" }),
      entry({ month: "2026-08", status: "Realizado", type: "Realizado" }),
    ];

    const result = annualSummary(rows, 2026);
    expect(result).toHaveLength(12);
    expect(result[0]).toMatchObject({ month: "2026-01", total: 2, realizado: 1, executionRate: 50 });
    expect(result[7]).toMatchObject({ month: "2026-08", total: 1, realizado: 1, executionRate: 100 });
    expect(result[11]).toMatchObject({ month: "2026-12", total: 0, executionRate: 0 });
  });
});
