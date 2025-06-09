/**
 * Parses a semicolon-separated string into an array of strings.
 * Trims whitespace from each part and filters out empty strings.
 *
 * @param value - The string to parse. Can be undefined or null.
 * @returns An array of strings, or an empty array if the input is null, undefined, or an empty/whitespace-only string.
 */
export function parseSemicolonSeparatedStringToArray(value: string | undefined | null): string[] {
  if (typeof value === "string" && value.trim() !== "") {
    return value
      .split(";")
      .map((id) => id.trim())
      .filter((id) => id !== "");
  }
  return [];
}
