const OPERATION_TIME_ZONE = "America/Maceio";

export function operationalDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: OPERATION_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(values.year),
    monthNumber: Number(values.month),
    day: Number(values.day),
    month: `${values.year}-${values.month}`,
    date: `${values.year}-${values.month}-${values.day}`,
  };
}

export function operationalYear(date = new Date()) {
  return operationalDateParts(date).year;
}

export function operationalDate(date = new Date()) {
  return operationalDateParts(date).date;
}

export function operationalMonth(date = new Date()) {
  return operationalDateParts(date).month;
}

export { OPERATION_TIME_ZONE };
