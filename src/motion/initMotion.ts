import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { splitElement } from "./splitText";

gsap.registerPlugin(ScrollTrigger);

type Cleanups = Array<() => void>;

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function observeOnce(
  elements: Element[],
  onEnter: (els: Element[]) => void,
  rootMargin = "0px 0px -10% 0px",
): () => void {
  const io = new IntersectionObserver(
    (entries) => {
      const hit = entries.filter((e) => e.isIntersecting).map((e) => e.target);
      if (!hit.length) return;
      hit.forEach((el) => io.unobserve(el));
      onEnter(hit);
    },
    { rootMargin },
  );
  elements.forEach((el) => io.observe(el));
  return () => io.disconnect();
}

function observeToggle(
  el: Element,
  on: () => void,
  off: () => void,
): () => void {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => (e.isIntersecting ? on() : off()));
    },
    { rootMargin: "0px" },
  );
  io.observe(el);
  return () => io.disconnect();
}

function initLenis(cleanups: Cleanups) {
  const lenis = new Lenis({ lerp: 0.11 });
  lenis.on("scroll", ScrollTrigger.update);
  const tick = (time: number) => {
    lenis.raf(time * 1000);
  };
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);

  const onOpen = () => lenis.stop();
  const onClose = () => lenis.start();
  document.addEventListener("menu:open", onOpen);
  document.addEventListener("menu:close", onClose);

  cleanups.push(() => {
    gsap.ticker.remove(tick);
    document.removeEventListener("menu:open", onOpen);
    document.removeEventListener("menu:close", onClose);
    lenis.destroy();
  });

  return lenis;
}

function initAnchors(root: ParentNode, lenis: Lenis | null, cleanups: Cleanups) {
  root.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) => {
    const onClick = (e: MouseEvent) => {
      const href = a.getAttribute("href");
      if (!href || href.length < 2) return;
      const target = document.getElementById(href.slice(1));
      if (!target) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(target, { duration: 1.4 });
      else target.scrollIntoView({ behavior: "smooth" });
    };
    a.addEventListener("click", onClick);
    cleanups.push(() => a.removeEventListener("click", onClick));
  });
}

function initHeader(root: ParentNode, cleanups: Cleanups) {
  const header = root.querySelector<HTMLElement>(".site-header");
  if (!header) return;

  const st = ScrollTrigger.create({
    start: 0,
    end: "max",
    onUpdate: (self) => {
      if (header.classList.contains("is-open")) return;
      header.classList.toggle(
        "is-hidden",
        self.direction > 0 && self.scroll() > innerHeight * 0.7,
      );
      header.dataset.scrolled = self.scroll() > 12 ? "true" : "false";
    },
  });
  cleanups.push(() => st.kill());
}

function initHeroPin(root: ParentNode, cleanups: Cleanups) {
  const hero = root.querySelector<HTMLElement>(".hero");
  if (!hero) return;
  const stack = hero.querySelector<HTMLElement>(".hero__stack");
  if (!stack) return;
  const windowEl = hero.querySelector<HTMLElement>(".hero__window");
  const photo = hero.querySelector<HTMLElement>(".hero__photo");
  const rows = hero.querySelectorAll<HTMLElement>(".hero__stack .row");

  const tl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: hero,
      start: "top top",
      end: "+=110%",
      pin: true,
      scrub: 0.6,
      invalidateOnRefresh: true,
    },
  });

  if (windowEl) {
    tl.fromTo(
      windowEl,
      {
        "--dd": () => `${Math.min(innerWidth, innerHeight) * 0.14}px`,
      },
      {
        "--dd": () => `${Math.hypot(innerWidth, innerHeight)}px`,
        ease: "power2.in",
      },
      0,
    );
  }

  const media = [photo, windowEl].filter(Boolean) as HTMLElement[];
  if (media.length) tl.fromTo(media, { scale: 1.08 }, { scale: 1 }, 0);
  if (rows.length) {
    tl.fromTo(
      rows,
      { scaleY: 1 },
      {
        scaleY: 1.55,
        transformOrigin: "50% 0%",
        stagger: 0.05,
        ease: "power1.in",
      },
      0,
    );
  }
  tl.to(stack, { yPercent: -14 }, 0);

  cleanups.push(() => tl.kill());
}

function initTickers(root: ParentNode, cleanups: Cleanups) {
  const velocityTweens: gsap.core.Tween[] = [];

  root.querySelectorAll<HTMLElement>("[data-ticker]").forEach((ticker) => {
    const track = ticker.querySelector<HTMLElement>(".ticker__track");
    if (!track) return;

    const originals = [...track.children] as HTMLElement[];
    const baseWidth = track.scrollWidth;
    if (!originals.length || !baseWidth) return;

    const gap = parseFloat(getComputedStyle(track).columnGap || "0") || 0;
    const unit = baseWidth + gap;
    const copies = Math.max(1, Math.ceil(ticker.clientWidth / unit) + 1);
    const reverse = ticker.dataset.dir === "rev";

    for (let i = 0; i < copies; i++) {
      const frag = document.createDocumentFragment();
      originals.forEach((node) => {
        const clone = node.cloneNode(true) as HTMLElement;
        clone.setAttribute("aria-hidden", "true");
        clone.querySelectorAll("a, button").forEach((el) => {
          (el as HTMLElement).tabIndex = -1;
        });
        frag.append(clone);
      });
      if (reverse) track.prepend(frag);
      else track.append(frag);
    }

    const startX = reverse ? -copies * unit : 0;
    const speed = parseFloat(ticker.dataset.speed || "55");
    const tween = gsap.fromTo(
      track,
      { x: startX },
      {
        x: startX + (reverse ? unit : -unit),
        duration: unit / speed,
        ease: "none",
        repeat: -1,
        paused: true,
      },
    );

    let visible = false;
    let paused = false;
    const sync = () => {
      if (visible && !paused) tween.play();
      else tween.pause();
    };

    cleanups.push(
      observeToggle(
        ticker,
        () => {
          visible = true;
          sync();
        },
        () => {
          visible = false;
          sync();
        },
      ),
    );

    if (ticker.hasAttribute("data-pause")) {
      const pause = () => {
        paused = true;
        sync();
      };
      const resume = () => {
        paused = false;
        sync();
      };
      ticker.addEventListener("mouseenter", pause);
      ticker.addEventListener("mouseleave", resume);
      ticker.addEventListener("focusin", pause);
      ticker.addEventListener("focusout", resume);
      cleanups.push(() => {
        ticker.removeEventListener("mouseenter", pause);
        ticker.removeEventListener("mouseleave", resume);
        ticker.removeEventListener("focusin", pause);
        ticker.removeEventListener("focusout", resume);
      });
    } else {
      velocityTweens.push(tween);
    }

    cleanups.push(() => tween.kill());
  });

  // Match production: ticker speed reacts a bit to scroll velocity
  if (velocityTweens.length) {
    let target = 1;
    let current = 1;
    const st = ScrollTrigger.create({
      start: 0,
      end: "max",
      onUpdate: (self) => {
        target = 1 + Math.min(Math.abs(self.getVelocity()) / 260, 7);
      },
    });
    const onTick = () => {
      target += (1 - target) * 0.05;
      const next = current + (target - current) * 0.1;
      if (Math.abs(next - current) < 0.001) return;
      current = next;
      velocityTweens.forEach((t) => t.timeScale(current));
    };
    gsap.ticker.add(onTick);
    cleanups.push(() => {
      st.kill();
      gsap.ticker.remove(onTick);
    });
  }
}

function initHeroBreath(root: ParentNode, cleanups: Cleanups) {
  const fills = [
    ...root.querySelectorAll<HTMLElement>(".hero__stack .fill"),
  ];
  if (!fills.length) return;

  const chars: HTMLElement[] = [];
  const reverts: Array<() => void> = [];
  fills.forEach((el) => {
    const split = splitElement(el, "chars");
    chars.push(...split.chars);
    reverts.push(split.revert);
  });
  if (!chars.length) return;

  gsap.set(chars, { willChange: "transform" });
  const tween = gsap.to(chars, {
    scaleY: 0.84,
    transformOrigin: "50% 50%",
    duration: 1.5,
    ease: "sine.inOut",
    stagger: { each: 0.09, repeat: -1, yoyo: true },
    paused: true,
  });

  const hero = root.querySelector(".hero");
  if (hero) {
    cleanups.push(
      observeToggle(
        hero,
        () => tween.play(),
        () => tween.pause(),
      ),
    );
  } else tween.play();

  cleanups.push(() => {
    tween.kill();
    reverts.forEach((r) => r());
  });
}

function initReveals(root: ParentNode, cleanups: Cleanups) {
  const reveals = [
    ...root.querySelectorAll<HTMLElement>("[data-reveal]"),
  ];
  if (reveals.length) {
    gsap.set(reveals, { y: 44, opacity: 0 });
    cleanups.push(
      observeOnce(reveals, (els) => {
        gsap.to(els, {
          y: 0,
          opacity: 1,
          duration: 1.1,
          ease: "power3.out",
          stagger: 0.08,
          clearProps: "transform",
        });
      }),
    );
  }
}

function initParallax(root: ParentNode, cleanups: Cleanups) {
  root.querySelectorAll<HTMLElement>("[data-parallax]").forEach((el) => {
    const amount = parseFloat(el.dataset.parallax || "8");
    const tween = gsap.fromTo(
      el,
      { yPercent: -amount },
      {
        yPercent: amount,
        ease: "none",
        scrollTrigger: {
          trigger: el.parentElement || el,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      },
    );
    cleanups.push(() => tween.kill());
  });
}

function initLines(root: ParentNode, cleanups: Cleanups) {
  root.querySelectorAll<HTMLElement>("[data-lines]").forEach((el) => {
    const split = splitElement(el, "lines");
    let played = false;
    let tween: gsap.core.Tween | null = gsap.from(split.lines, {
      yPercent: 110,
      duration: 1.15,
      ease: "expo.out",
      stagger: 0.07,
      paused: true,
    });

    cleanups.push(
      observeOnce(
        [el],
        () => {
          played = true;
          tween?.play();
        },
        "0px 0px -18% 0px",
      ),
    );

    cleanups.push(() => {
      tween?.kill();
      tween = null;
      if (!played) split.revert();
    });
  });
}

function initRunsPin(root: ParentNode, cleanups: Cleanups) {
  const section = root.querySelector<HTMLElement>(".runs");
  const track = section?.querySelector<HTMLElement>(".runs__track");
  if (!section || !track) return;

  type Poster = {
    el: HTMLElement;
    left: number;
    w: number;
    ph: ((v: number) => void) | null;
    name: ((v: number) => void) | null;
  };

  const posters: Poster[] = [
    ...section.querySelectorAll<HTMLElement>(".poster"),
  ].map((el) => {
    const photo = el.querySelector<HTMLElement>(".poster__photo");
    const type = el.querySelector<HTMLElement>(".poster__type");
    return {
      el,
      left: 0,
      w: 1,
      ph: photo ? gsap.quickSetter(photo, "xPercent") : null,
      name: type ? gsap.quickSetter(type, "xPercent") : null,
    };
  });

  let maxX = 0;
  const measure = () => {
    maxX = Math.max(0, track.scrollWidth - innerWidth);
    posters.forEach((p) => {
      p.left = p.el.offsetLeft;
      p.w = p.el.offsetWidth || 1;
    });
  };

  const applyParallax = (x: number) => {
    posters.forEach((p) => {
      const n = gsap.utils.clamp(
        -1,
        1,
        (p.left + p.w / 2 + x - innerWidth / 2) / (innerWidth / 2 + p.w / 2),
      );
      p.ph?.(-8 * n);
      p.name?.(24 * n);
    });
  };

  measure();
  const tween = gsap.to(track, {
    x: () => -maxX,
    ease: "none",
    onUpdate: () => applyParallax(Number(gsap.getProperty(track, "x"))),
    scrollTrigger: {
      trigger: section,
      start: "top top",
      end: () => `+=${maxX}`,
      pin: true,
      scrub: 0.8,
      invalidateOnRefresh: true,
      onRefreshInit: measure,
      onRefresh: () => applyParallax(Number(gsap.getProperty(track, "x"))),
    },
  });
  applyParallax(0);
  cleanups.push(() => tween.kill());
}

function initRubber(root: ParentNode, cleanups: Cleanups) {
  root.querySelectorAll<HTMLElement>("[data-rubber]").forEach((el) => {
    const split = splitElement(el, "chars");
    if (!split.chars.length) return;
    gsap.set(split.chars, {
      transformOrigin: "50% 100%",
      willChange: "transform",
    });
    const tl = gsap
      .timeline({
        scrollTrigger: {
          trigger: el.parentElement || el,
          start: "top bottom",
          end: "bottom top",
          scrub: 0.4,
        },
      })
      .fromTo(
        split.chars,
        { scaleY: 0.05 },
        { scaleY: 1, ease: "back.out(2)", duration: 1, stagger: 0.07 },
      )
      .to(
        split.chars,
        { scaleY: 1.45, ease: "power2.in", duration: 1, stagger: 0.04 },
        "+=0.4",
      );
    cleanups.push(() => {
      tl.kill();
      split.revert();
    });
  });
}

function initDiamond(root: ParentNode, cleanups: Cleanups) {
  root.querySelectorAll<HTMLElement>("[data-diamond]").forEach((el) => {
    const img = el.querySelector("img");
    const tl = gsap.timeline({ paused: true });
    tl.fromTo(
      el,
      { clipPath: "polygon(50% 50%, 50% 50%, 50% 50%, 50% 50%)" },
      {
        clipPath: "polygon(50% -50%, 150% 50%, 50% 150%, -50% 50%)",
        duration: 1.35,
        ease: "expo.inOut",
      },
    );
    if (img) {
      tl.fromTo(
        img,
        { scale: 1.3 },
        { scale: 1, duration: 1.7, ease: "expo.out" },
        0.15,
      );
    }
    cleanups.push(
      observeOnce([el], () => tl.play(), "0px 0px -14% 0px"),
    );
    cleanups.push(() => tl.kill());
  });
}

function initWeek(root: ParentNode, cleanups: Cleanups) {
  const slots = [...root.querySelectorAll<HTMLElement>(".week .slot")];
  if (!slots.length) return;
  cleanups.push(
    observeOnce(slots, (els) => {
      els.forEach((el, i) => {
        (el as HTMLElement).style.setProperty("--delay", `${i * 0.12}s`);
        el.classList.add("is-in");
      });
    }),
  );
}

function initWords(root: ParentNode, cleanups: Cleanups) {
  root.querySelectorAll<HTMLElement>("[data-words]").forEach((el) => {
    const split = splitElement(el, "words");
    if (!split.words.length) return;
    const tween = gsap.fromTo(
      split.words,
      { opacity: 0.14 },
      {
        opacity: 1,
        ease: "none",
        stagger: 0.1,
        scrollTrigger: {
          trigger: el,
          start: "top 82%",
          end: "bottom 48%",
          scrub: true,
        },
      },
    );
    cleanups.push(() => {
      tween.kill();
      split.revert();
    });
  });
}

function initStepsGeometry(root: ParentNode, cleanups: Cleanups) {
  root.querySelectorAll<HTMLElement>(".steps").forEach((section) => {
    const wrap = section.querySelector<HTMLElement>(".steps__wrap");
    const path = section.querySelector<SVGPathElement>(".steps__line path");
    const steps = [...section.querySelectorAll<HTMLElement>(".step")];
    if (!wrap || !path || !steps.length) return;

    steps.forEach((step, i) => {
      step.style.setProperty("--i", String(i));
      step.style.setProperty("--n", String(steps.length));
    });

    const layout = () => {
      const pointOf = (el: HTMLElement): [number, number] => {
        let x = el.offsetWidth / 2;
        let y = el.offsetHeight / 2;
        for (let n: HTMLElement | null = el; n && n !== wrap; n = n.offsetParent as HTMLElement | null) {
          x += n.offsetLeft;
          y += n.offsetTop;
        }
        return [x, y];
      };

      const marks = steps.map((s) =>
        pointOf(s.querySelector<HTMLElement>(".step__mark") || s),
      );
      const first = marks[0];
      const last = marks[marks.length - 1];
      const t = { width: wrap.clientWidth, height: wrap.clientHeight };
      const ends: [number, number][] =
        marks.length < 2 || Math.abs(last[0] - first[0]) < 8
          ? [
              [first[0], first[1] - 30],
              [last[0], t.height],
            ]
          : [
              [0, first[1] + 70],
              [t.width, last[1] - 70],
            ];
      const pts = [ends[0], ...marks, ends[1]];
      path.setAttribute(
        "d",
        `M${pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" L")}`,
      );
    };

    layout();
    const onResize = () => layout();
    window.addEventListener("resize", onResize);
    document.fonts?.ready.then(() => layout());
    cleanups.push(() => window.removeEventListener("resize", onResize));

    const length = () => path.getTotalLength() || 1;
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: wrap,
        start: "top 78%",
        end: "bottom 60%",
        scrub: 0.6,
        invalidateOnRefresh: true,
      },
    });
    tl.fromTo(
      path,
      { strokeDasharray: () => length(), strokeDashoffset: () => length() },
      { strokeDashoffset: 0, ease: "none", duration: 1 },
      0,
    );
    steps.forEach((step, i) => {
      tl.fromTo(
        step,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.16, ease: "power2.out" },
        (i / steps.length) * 0.9,
      );
    });
    cleanups.push(() => tl.kill());
  });
}

function initGalleryTilt(root: ParentNode, cleanups: Cleanups) {
  const sections = [
    ...root.querySelectorAll<HTMLElement>("main > *"),
  ];
  sections.forEach((section) => {
    const tilts = [...section.querySelectorAll<HTMLElement>("[data-tilt]")];
    if (!tilts.length) return;
    cleanups.push(
      observeOnce(
        tilts,
        (els) => {
          gsap.fromTo(
            els,
            {
              rotateX: 34,
              y: 80,
              opacity: 0,
              transformOrigin: "50% 100%",
            },
            {
              rotateX: 0,
              y: 0,
              opacity: 1,
              duration: 1.4,
              ease: "expo.out",
              stagger: 0.1,
              clearProps: "transform",
            },
          );
          const imgs = els
            .map((el) => el.querySelector("img"))
            .filter(Boolean) as HTMLElement[];
          if (imgs.length) {
            gsap.fromTo(
              imgs,
              { scale: 1.22 },
              {
                scale: 1,
                duration: 1.9,
                ease: "expo.out",
                stagger: 0.1,
              },
            );
          }
        },
        "0px 0px -8% 0px",
      ),
    );
  });
}

function initChart(root: ParentNode, cleanups: Cleanups) {
  root.querySelectorAll<HTMLElement>("[data-chart]").forEach((chart) => {
    const bars = [...chart.querySelectorAll<HTMLElement>(".bar")];
    const vals = bars.map(
      (b) =>
        parseFloat(
          ((b.querySelector(".bar__val") || {}).textContent || "").replace(
            /[^\d.]/g,
            "",
          ),
        ) || 0,
    );
    const max = Math.max(...vals, 1);
    bars.forEach((b, i) => b.style.setProperty("--h", (vals[i] / max).toFixed(3)));

    const fills = chart.querySelectorAll(".bar__fill");
    const labels = chart.querySelectorAll(".bar__val");
    if (!fills.length) return;
    const tl = gsap.timeline({ paused: true });
    tl.fromTo(
      fills,
      { scaleY: 0 },
      { scaleY: 1, duration: 1.3, ease: "expo.out", stagger: 0.07 },
    );
    if (labels.length) {
      tl.fromTo(
        labels,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.07 },
        0.35,
      );
    }
    cleanups.push(
      observeOnce([chart], () => tl.play(), "0px 0px -22% 0px"),
    );
    cleanups.push(() => tl.kill());
  });
}

function initRise(root: ParentNode, cleanups: Cleanups) {
  const parents = new Set(
    [...root.querySelectorAll("[data-rise]")].map((el) => el.parentElement),
  );
  parents.forEach((parent) => {
    if (!parent) return;
    const items = [...parent.children].filter((el) =>
      el.hasAttribute("data-rise"),
    ) as HTMLElement[];
    if (!items.length) return;
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: parent,
        start: "top bottom",
        end: "top 35%",
        scrub: 0.5,
      },
    });
    items.forEach((el, i) => {
      tl.fromTo(
        el,
        { y: 70 + i * 55 },
        { y: 0, ease: "none", duration: 1 },
        0,
      );
    });
    cleanups.push(() => tl.kill());
  });
}

function initFaq(root: ParentNode, cleanups: Cleanups) {
  const qas = [...root.querySelectorAll<HTMLElement>(".faq .qa")];
  if (!qas.length) return;
  cleanups.push(
    observeOnce(
      qas,
      (els) => {
        els.forEach((el, i) => {
          (el as HTMLElement).style.setProperty("--delay", `${i * 0.09}s`);
          el.classList.add("is-in");
        });
      },
      "0px 0px -8% 0px",
    ),
  );
}

function initContact(root: ParentNode, cleanups: Cleanups) {
  const section = root.querySelector<HTMLElement>(".contact");
  if (!section) return;
  const type = section.querySelector<HTMLElement>(".contact__type .fills");
  const photo = section.querySelector<HTMLElement>(".contact__photo");
  const base = {
    trigger: section,
    start: "top bottom",
    end: "top top",
    scrub: 0.6,
  } as const;

  if (type) {
    const tween = gsap.fromTo(
      type,
      { yPercent: 65 },
      { yPercent: 0, ease: "none", scrollTrigger: base },
    );
    cleanups.push(() => tween.kill());
  }
  if (photo) {
    const tween = gsap.fromTo(
      photo,
      { scale: 1.18 },
      {
        scale: 1,
        ease: "none",
        scrollTrigger: { ...base, end: "bottom bottom" },
      },
    );
    cleanups.push(() => tween.kill());
  }
}

function initSectionEntrances(root: ParentNode, cleanups: Cleanups) {
  // Soft fallback for heads that aren't covered by data-* hooks
  const heads = [
    ...root.querySelectorAll<HTMLElement>(
      ".about .about__lead, .values .head, .week .head, .crew .head, .steps .head, .season .head, .membership .head, .faq__side, .gallery__cap",
    ),
  ];
  if (!heads.length) return;
  gsap.set(heads, { y: 36, opacity: 0 });
  cleanups.push(
    observeOnce(heads, (els) => {
      gsap.to(els, {
        y: 0,
        opacity: 1,
        duration: 1,
        ease: "power3.out",
        stagger: 0.08,
        clearProps: "transform",
      });
    }, "0px 0px -12% 0px"),
  );
}

/**
 * Full-page motion layer modeled on the production DevAssistant Home bundle:
 * Lenis smooth scroll, hero pin, horizontal programmes pin, rubber/diamond/
 * words/lines, steps path draw, gallery tilt, chart/rise, FAQ + contact scrub.
 */
export function initMotion(root: ParentNode): () => void {
  const cleanups: Cleanups = [];

  if (prefersReducedMotion()) {
    return () => undefined;
  }

  document.documentElement.classList.add("motion");

  const lenis = initLenis(cleanups);
  initAnchors(root, lenis, cleanups);
  initHeader(root, cleanups);
  initHeroPin(root, cleanups);
  initTickers(root, cleanups);
  initHeroBreath(root, cleanups);
  initReveals(root, cleanups);
  initParallax(root, cleanups);
  initLines(root, cleanups);
  initRunsPin(root, cleanups);
  initRubber(root, cleanups);
  initDiamond(root, cleanups);
  initWeek(root, cleanups);
  initWords(root, cleanups);
  initStepsGeometry(root, cleanups);
  initGalleryTilt(root, cleanups);
  initChart(root, cleanups);
  initRise(root, cleanups);
  initFaq(root, cleanups);
  initContact(root, cleanups);
  initSectionEntrances(root, cleanups);

  requestAnimationFrame(() => ScrollTrigger.refresh());
  // fonts can shift layout — refresh again when ready
  document.fonts?.ready.then(() => ScrollTrigger.refresh());

  return () => {
    cleanups.forEach((fn) => {
      try {
        fn();
      } catch {
        /* ignore */
      }
    });
    ScrollTrigger.getAll().forEach((t) => t.kill());
    document.documentElement.classList.remove("motion");
  };
}
