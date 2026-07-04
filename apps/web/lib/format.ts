// The ONLY place sen becomes RM — money stays integer sen everywhere else.
export function formatRM(sen: number): string {
  return `RM ${(sen / 100).toFixed(2)}`;
}
