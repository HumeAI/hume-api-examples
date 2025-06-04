export const truncateDataReplacer = (k: string, v: unknown) => {
  if (k === "data" && typeof v === "string") {
    return v.slice(0, 10) + "...";
  }
  return v;
};
export const exhaustive = (x: never): any => {
  throw new Error("Unexpected value: " + x);
};
