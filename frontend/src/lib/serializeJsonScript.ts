/** Ασφαλές JSON μέσα σε <script type="application/json"> (χωρίς XSS breakout). */
export function serializeJsonForScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
