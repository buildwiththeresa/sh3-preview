import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import markup from "../content/homeMarkup.html?raw";
import { initMotion } from "../motion/initMotion";

/**
 * Similar source reconstruction of the SH3 / Ridge Runners production homepage.
 * Not the original DevAssistant project tree — rebuilt from recovered SSR HTML + CSS.
 *
 * Markup lives in `src/content/homeMarkup.html` (editable HTML from the live SSR).
 * React wires mobile menu, FAQ accordion, and motion (tickers / reveals / parallax).
 */
export default function HomePage() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const menuBtn = root.querySelector<HTMLButtonElement>(".menu-btn");
    const menu = root.querySelector<HTMLElement>("#menu");

    const setMenu = (open: boolean) => {
      if (!menuBtn || !menu) return;
      const header = root.querySelector(".site-header");
      menu.toggleAttribute("hidden", !open);
      menuBtn.setAttribute("aria-expanded", String(open));
      menuBtn.textContent = open
        ? menuBtn.dataset.close || "Close"
        : menuBtn.dataset.open || "Menu";
      header?.classList.toggle("is-open", open);
      document.dispatchEvent(
        new CustomEvent(open ? "menu:open" : "menu:close"),
      );
    };

    const toggleMenu = () => {
      if (!menu) return;
      setMenu(menu.hasAttribute("hidden"));
    };

    menuBtn?.addEventListener("click", toggleMenu);
    const onMenuLink = (e: Event) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest("a")) setMenu(false);
    };
    menu?.addEventListener("click", onMenuLink);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && menu && !menu.hasAttribute("hidden")) {
        setMenu(false);
      }
    };
    document.addEventListener("keydown", onKey);

    const faqButtons = Array.from(
      root.querySelectorAll<HTMLButtonElement>(".qa__q"),
    );

    const onFaq = (btn: HTMLButtonElement) => {
      const id = btn.getAttribute("aria-controls");
      if (!id) return;
      const panel = root.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
      if (!panel) return;
      const willOpen = panel.hasAttribute("hidden");
      root.querySelectorAll<HTMLElement>(".qa__a").forEach((el) => {
        el.setAttribute("hidden", "");
      });
      root.querySelectorAll<HTMLButtonElement>(".qa__q").forEach((b) => {
        b.setAttribute("aria-expanded", "false");
      });
      if (willOpen) {
        panel.removeAttribute("hidden");
        btn.setAttribute("aria-expanded", "true");
        gsap.fromTo(
          panel,
          { opacity: 0, y: -10 },
          {
            opacity: 1,
            y: 0,
            duration: 0.5,
            ease: "power3.out",
            clearProps: "transform",
          },
        );
      }
    };

    const faqHandlers = faqButtons.map((btn) => {
      const handler = () => onFaq(btn);
      btn.addEventListener("click", handler);
      return { btn, handler };
    });

    const donateRoot = root.querySelector<HTMLElement>("[data-donate-campaign]");
    const tabBtns = Array.from(
      root.querySelectorAll<HTMLButtonElement>("[data-donate-tab]"),
    );
    const sortBtns = Array.from(
      root.querySelectorAll<HTMLButtonElement>("[data-donate-sort]"),
    );
    const donorList = root.querySelector<HTMLElement>("[data-donor-list]");

    const setDonateTab = (key: string) => {
      tabBtns.forEach((btn) => {
        const on = btn.dataset.donateTab === key;
        btn.classList.toggle("is-active", on);
        btn.setAttribute("aria-selected", String(on));
      });
      root.querySelectorAll<HTMLElement>(".campaign__panel").forEach((panel) => {
        const on = panel.id === `panel-${key}`;
        panel.classList.toggle("is-active", on);
        panel.toggleAttribute("hidden", !on);
      });
    };

    const sortDonors = (mode: "newest" | "biggest") => {
      if (!donorList) return;
      const items = Array.from(donorList.querySelectorAll<HTMLElement>(".donor"));
      items.sort((a, b) => {
        const av = Number(a.dataset[mode === "biggest" ? "amount" : "time"] || 0);
        const bv = Number(b.dataset[mode === "biggest" ? "amount" : "time"] || 0);
        return bv - av;
      });
      items.forEach((el) => donorList.appendChild(el));
      sortBtns.forEach((btn) => {
        const on = btn.dataset.donateSort === mode;
        btn.classList.toggle("is-active", on);
        btn.setAttribute("aria-pressed", String(on));
      });
    };

    const tabHandlers = tabBtns.map((btn) => {
      const handler = () => setDonateTab(btn.dataset.donateTab || "donatur");
      btn.addEventListener("click", handler);
      return { btn, handler };
    });
    const sortHandlers = sortBtns.map((btn) => {
      const handler = () =>
        sortDonors(
          btn.dataset.donateSort === "newest" ? "newest" : "biggest",
        );
      btn.addEventListener("click", handler);
      return { btn, handler };
    });
    if (donateRoot) sortDonors("biggest");

    // Defer motion until after paint so layout widths are correct for tickers.
    let killMotion: (() => void) | undefined;
    const raf = requestAnimationFrame(() => {
      killMotion = initMotion(root);
      setReady(true);
    });

    return () => {
      cancelAnimationFrame(raf);
      killMotion?.();
      menuBtn?.removeEventListener("click", toggleMenu);
      menu?.removeEventListener("click", onMenuLink);
      document.removeEventListener("keydown", onKey);
      faqHandlers.forEach(({ btn, handler }) =>
        btn.removeEventListener("click", handler),
      );
      tabHandlers.forEach(({ btn, handler }) =>
        btn.removeEventListener("click", handler),
      );
      sortHandlers.forEach(({ btn, handler }) =>
        btn.removeEventListener("click", handler),
      );
    };
  }, []);

  return (
    <div
      ref={rootRef}
      data-ready={ready ? "true" : "false"}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}
