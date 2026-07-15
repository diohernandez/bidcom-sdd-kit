export function stripSemverRange(rawVersion: string): string {
  return rawVersion.replace(/^[\^~]/, "");
}
