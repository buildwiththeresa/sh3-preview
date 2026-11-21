/** Lightweight SplitText stand-in (chars / words / lines). */

export type SplitResult = {
  chars: HTMLElement[];
  words: HTMLElement[];
  lines: HTMLElement[];
  revert: () => void;
};

function wrap(text: string, className: string): HTMLElement {
  const span = document.createElement("span");
  span.className = className;
  span.style.display = "inline-block";
  span.textContent = text === " " ? "\u00A0" : text;
  return span;
}

export function splitElement(
  el: HTMLElement,
  type: "chars" | "words" | "lines",
): SplitResult {
  const original = el.innerHTML;
  const text = el.textContent || "";

  const chars: HTMLElement[] = [];
  const words: HTMLElement[] = [];
  const lines: HTMLElement[] = [];

  if (type === "chars") {
    el.textContent = "";
    [...text].forEach((ch) => {
      const node = wrap(ch, "split-char");
      el.append(node);
      chars.push(node);
    });
  } else if (type === "words") {
    el.textContent = "";
    text.split(/(\s+)/).forEach((part) => {
      if (!part) return;
      if (/^\s+$/.test(part)) {
        el.append(document.createTextNode(part));
        return;
      }
      const node = wrap(part, "split-word");
      el.append(node);
      words.push(node);
    });
  } else {
    // lines: approximate by wrapping whole content in a masked line
    el.textContent = "";
    const line = document.createElement("span");
    line.className = "split-line";
    line.style.display = "block";
    line.style.overflow = "hidden";
    const inner = wrap(text, "split-line-inner");
    inner.style.display = "block";
    line.append(inner);
    el.append(line);
    lines.push(inner);
  }

  return {
    chars,
    words,
    lines,
    revert: () => {
      el.innerHTML = original;
    },
  };
}
