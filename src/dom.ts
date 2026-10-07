type Child = Node | string | null | undefined | false;

/** Tiny DOM builder. Strings become text nodes, so report content can never inject markup. */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | boolean | undefined> = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === false) continue;
    if (v === true) el.setAttribute(k, "");
    else el.setAttribute(k, v);
  }
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    el.append(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return el;
}

/** Only https links from report data are made clickable. */
export function safeHttpsUrl(value: string): string | null {
  try {
    const u = new URL(value);
    return u.protocol === "https:" ? u.href : null;
  } catch {
    return null;
  }
}
