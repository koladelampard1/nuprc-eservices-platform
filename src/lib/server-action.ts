export function isNextRedirectError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const digest = "digest" in error ? error.digest : undefined;
  return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT");
}
