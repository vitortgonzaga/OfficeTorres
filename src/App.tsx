import { Component, Suspense, lazy, useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { PROJECTS } from "./content/projects";
import { ABOUT, SECRETS, SPOTS, TOUR, UI, type Lang, type SecretId, type SpotId } from "./content/site";
import type { ScoreKind } from "./scene/ballInput";
import { SpotContent } from "./ui/SpotContent";
import { useBottomSheet } from "./ui/useBottomSheet";

const Scene = lazy(() => import("./scene/OfficeScene"));

interface Route {
  spot: SpotId | null;
  slug?: string;
}

const MONITOR_TABS = ["terminal", "github"];

function parseHash(): Route {
  const [, spot, slug] = location.hash.split("/");
  if (!SPOTS.some((item) => item.id === spot)) return { spot: null };
  const validTab = spot === "monitor" && MONITOR_TABS.includes(slug);
  return { spot: spot as SpotId, slug: validTab || PROJECTS.some((item) => item.slug === slug) ? slug : undefined };
}

const hashFor = (spot: SpotId | null, slug?: string) => (spot ? `#/${spot}${slug ? `/${slug}` : ""}` : "#/");

/**
 * Checked only once. Browsers keep about 16 graphics contexts per page and kill the
 * oldest one past that, so testing on every render would eventually kill the office.
 */
const hasWebGL = (() => {
  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    context?.getExtension("WEBGL_lose_context")?.loseContext();
    return Boolean(context);
  } catch {
    return false;
  }
})();

class SceneBoundary extends Component<{ onFail: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFail();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function ThemeSwitch({ day, lang, onToggle }: { day: boolean; lang: Lang; onToggle: () => void }) {
  const label = (day ? UI.themeToNight : UI.themeToDay)[lang];
  return (
    <button className={`theme-switch${day ? " is-day" : ""}`} role="switch" aria-checked={!day} aria-label={label} title={label} onClick={onToggle}>
      <svg className="theme-icon sun" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="4.2" />
        <path d="M12 2.6v2.6M12 18.8v2.6M2.6 12h2.6M18.8 12h2.6M5.35 5.35l1.85 1.85M16.8 16.8l1.85 1.85M18.65 5.35 16.8 7.2M7.2 16.8l-1.85 1.85" />
      </svg>
      <svg className="theme-icon moon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20 14.6A8.2 8.2 0 0 1 9.4 4a8.2 8.2 0 1 0 10.6 10.6Z" />
      </svg>
      <span className="theme-thumb" />
    </button>
  );
}

/** The bar fills for this long, even when the office is ready sooner. */
const LOADER_MS = 3700;
const LOADER_FINISH_MS = 300;
/** Lets the loader reach the screen first, because building the office blocks the page. */
const LOADER_PAINT_MS = 120;

/** Opposite faces add up to 7, like a real die. Pips are cells of a 3x3 grid. */
const DIE_FACES = [
  { side: "front", pips: [4] },
  { side: "back", pips: [0, 2, 3, 5, 6, 8] },
  { side: "right", pips: [0, 4, 8] },
  { side: "left", pips: [0, 2, 6, 8] },
  { side: "top", pips: [2, 6] },
  { side: "bottom", pips: [0, 2, 4, 6, 8] },
];

function Loader({ lang, step, finishing, done }: { lang: Lang; step: number; finishing: boolean; done: boolean }) {
  return (
    <div className={`loader${finishing ? " finishing" : ""}${done ? " done" : ""}`} role="status" aria-label={UI.loading[lang]}>
      <div className="loader-court" aria-hidden="true">
        <span className="loader-die">
          <span className="die-cube">
            {DIE_FACES.map(({ side, pips }) => (
              <span key={side} className={`die-face ${side}`}>
                {Array.from({ length: 9 }, (_, cell) => <i key={cell} className={pips.includes(cell) ? "on" : undefined} />)}
              </span>
            ))}
          </span>
        </span>
        <span className="loader-shadow" />
        <span className="loader-floor" />
      </div>
      <strong key={step}>{UI.loadingSteps[step][lang]}</strong>
      <span className="loader-bar"><i /></span>
    </div>
  );
}

const TOUR_KEY = "vg-tour-seen";

/** First-time visitors are offered the tour. Add ?tour to the address to see the offer again. */
function shouldOfferTour() {
  const params = new URLSearchParams(location.search);
  if (!hasWebGL || params.has("2d") || parseHash().spot) return false;
  if (params.has("tour")) return true;
  try {
    return !localStorage.getItem(TOUR_KEY);
  } catch {
    return true;
  }
}

function rememberTour() {
  try {
    localStorage.setItem(TOUR_KEY, "1");
  } catch {
    // Without storage the offer simply appears again next time.
  }
}

const isTouch = () => matchMedia("(pointer: coarse)").matches;
const forDevice = (text: string) => (isTouch() ? text.replace(/Clique/g, "Toque").replace(/clique/g, "toque").replace(/Click/g, "Tap").replace(/click/g, "tap") : text);

function TourCard({ step, lang, onSkip, onStop }: { step: number; lang: Lang; onSkip: () => void; onStop: () => void }) {
  return (
    <section className="tour-offer" aria-live="polite">
      <div className="tour-top">
        <span>{step + 1} / {TOUR.length}</span>
        <button onClick={onStop}>{UI.tourStop[lang]} ✕</button>
      </div>
      <i className="tour-progress"><b style={{ width: `${((step + 1) / TOUR.length) * 100}%` }} /></i>
      <p key={step}>{forDevice(TOUR[step].text[lang])}</p>
      <div className="tour-actions">
        <button className="button ghost" onClick={onSkip}>{UI.tourNext[lang]} →</button>
      </div>
    </section>
  );
}

interface Burst {
  id: number;
  kind: ScoreKind;
  x: number;
  y: number;
}

const CONFETTI = 18;
const BURST_MS = 1500;

/** Confirms a basket or a goal right where it happened. */
function ScoreBurst({ burst, lang }: { burst: Burst; lang: Lang }) {
  const left = Math.max(84, Math.min(burst.x, window.innerWidth - 84));
  const top = Math.max(120, Math.min(burst.y, window.innerHeight - 40));
  return (
    <div className={`score-burst ${burst.kind}`} role="status" style={{ left, top }}>
      <span className="score-ring" />
      {Array.from({ length: CONFETTI }, (_, i) => (
        <i key={i} style={{ "--angle": `${(i / CONFETTI) * 360}deg`, "--reach": `${62 + (i % 3) * 24}px`, "--delay": `${(i % 4) * 22}ms` } as CSSProperties} />
      ))}
      <strong>{(burst.kind === "hoop" ? UI.scoreHoop : UI.scoreGoal)[lang]}</strong>
    </div>
  );
}

function ReadingIcon() {
  return (
    <svg className="pill-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 6.4C10 4.9 7.2 4.4 3.5 4.8v13.6c3.7-.4 6.5.1 8.5 1.6 2-1.5 4.8-2 8.5-1.6V4.8C16.8 4.4 14 4.9 12 6.4Zm0 0V20" />
    </svg>
  );
}

function RoomIcon() {
  return (
    <svg className="pill-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Zm0 9 8-4.5M12 12 4 7.5M12 12v9" />
    </svg>
  );
}

function SecretCard({ secret, lang, onClose }: { secret: { id: SecretId; x: number; y: number }; lang: Lang; onClose: () => void }) {
  const isNote = secret.id === "claude";
  const width = Math.min(isNote ? 250 : 310, window.innerWidth - 24);
  const left = Math.max(12, Math.min(secret.x - width / 2, window.innerWidth - width - 12));
  const below = secret.y < window.innerHeight * 0.55;
  const style = below ? { left, width, top: secret.y + 18 } : { left, width, bottom: window.innerHeight - secret.y + 18 };
  return (
    <div className={`secret-card${isNote ? " is-note" : ""}`} role="status" style={style}>
      {!isNote && <span className="secret-dot" aria-hidden="true" />}
      <p>{SECRETS[secret.id][lang]}</p>
      <button onClick={onClose} aria-label={UI.secretClose[lang]}>✕</button>
    </div>
  );
}

function Tooltip({ label }: { label: string | null }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const move = (event: PointerEvent) => {
      ref.current?.style.setProperty("transform", `translate(${event.clientX + 16}px, ${event.clientY + 14}px)`);
    };
    window.addEventListener("pointermove", move);
    return () => window.removeEventListener("pointermove", move);
  }, []);
  return <div ref={ref} className={`tooltip${label ? " on" : ""}`} aria-hidden="true">{label}</div>;
}

function Panel({ route, lang, onClose, onNavigate }: { route: Route & { spot: SpotId }; lang: Lang; onClose: () => void; onNavigate: (spot: SpotId, slug?: string) => void }) {
  const spot = SPOTS.find((item) => item.id === route.spot)!;
  const ref = useRef<HTMLElement>(null);
  const project = route.slug ? PROJECTS.find((item) => item.slug === route.slug) : undefined;
  const path = `~/room/${spot.id}${route.slug ? `/${route.slug}` : ""}`;
  useBottomSheet(ref, onClose);

  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
    ref.current?.querySelector(".panel-body")?.scrollTo({ top: 0 });
  }, [route.spot, route.slug]);

  return (
    <aside ref={ref} className="panel" role="dialog" aria-label={project ? project.title[lang] : spot.label[lang]} tabIndex={-1} key={route.spot}>
      <button className="sheet-handle" aria-label={UI.sheetHandle[lang]}><span /></button>
      <header className="panel-head">
        {project ? (
          <button className="icon-button" onClick={() => onNavigate(route.spot)} aria-label={UI.back[lang]}>←</button>
        ) : (
          <span className="panel-grip" aria-hidden="true" />
        )}
        <div>
          <code>{path}</code>
          <h2>{spot.label[lang]}</h2>
        </div>
        <button className="icon-button" onClick={onClose} aria-label={UI.close[lang]}>✕</button>
      </header>
      <div className="panel-body">
        <SpotContent spot={route.spot} slug={route.slug} lang={lang} onProject={onNavigate} />
      </div>
    </aside>
  );
}

/** Reading mode puts the experience right after the introduction and before the projects. */
const FLAT_SPOTS = [...SPOTS.filter((spot) => spot.id === "about"), ...SPOTS.filter((spot) => spot.id === "cork"), ...SPOTS.filter((spot) => spot.id !== "about" && spot.id !== "cork")];

function FlatVersion({ lang, onProject, route }: { lang: Lang; onProject: (spot: SpotId, slug?: string) => void; route: Route }) {
  return (
    <main className="flat">
      {FLAT_SPOTS.map((spot) => (
        <section key={spot.id} id={spot.id}>
          <h2>{spot.id === "monitor" ? "GitHub" : spot.label[lang]}</h2>
          {route.spot === spot.id && PROJECTS.some((item) => item.slug === route.slug) && (
            <button className="text-link" onClick={() => onProject(spot.id)}>← {UI.back[lang]}</button>
          )}
          <SpotContent spot={spot.id} slug={route.spot === spot.id ? route.slug : undefined} lang={lang} onProject={onProject} readingMode />
        </section>
      ))}
    </main>
  );
}

export function App() {
  const [lang, setLang] = useState<Lang>(() => (navigator.language.toLowerCase().startsWith("pt") ? "pt" : "en"));
  const [route, setRoute] = useState<Route>(parseHash);
  const [flat, setFlat] = useState(() => !hasWebGL || new URLSearchParams(location.search).has("2d"));
  // Once built, the office stays alive behind Reading mode, so coming back is instant.
  const [sceneOn, setSceneOn] = useState(() => !flat);
  const [sceneKey, setSceneKey] = useState(0);
  const [sceneStarted, setSceneStarted] = useState(false);
  const [sceneBuilt, setSceneBuilt] = useState(false);
  const [minTimeDone, setMinTimeDone] = useState(false);
  const [ready, setReady] = useState(false);
  const [loadStep, setLoadStep] = useState(0);
  const [day, setDay] = useState(() => {
    const hour = new Date().getHours();
    return hour >= 6 && hour < 18;
  });
  const [secret, setSecret] = useState<{ id: SecretId; x: number; y: number } | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [burst, setBurst] = useState<Burst | null>(null);
  const finishing = sceneBuilt && minTimeDone;
  const [tourOffer, setTourOffer] = useState(shouldOfferTour);
  const [tourStep, setTourStep] = useState<number | null>(null);
  const [tourEnded, setTourEnded] = useState(false);
  const tourRef = useRef<number | null>(null);
  const tourVisited = useRef(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [hasLooked, setHasLooked] = useState(false);

  useEffect(() => {
    document.documentElement.lang = lang === "pt" ? "pt-BR" : "en";
  }, [lang]);

  useEffect(() => {
    document.documentElement.dataset.theme = day ? "day" : "night";
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", day ? "#dbe5f2" : "#25262a");
  }, [day]);

  useEffect(() => {
    const sync = () => setRoute(parseHash());
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  const navigate = useCallback((spot: SpotId | null, slug?: string) => {
    const hash = hashFor(spot, slug);
    if (location.hash !== hash) location.hash = hash;
    setHover(null);
    document.body.style.cursor = "";
  }, []);

  const close = useCallback(() => navigate(null), [navigate]);

  /** Clicking what is already open steps back out of it. */
  const toggleRoute = useCallback(
    (spot: SpotId, slug?: string) => {
      const current = parseHash();
      if (current.spot !== spot) navigate(spot, slug);
      else if (!slug) navigate(null);
      else navigate(spot, current.slug === slug ? undefined : slug);
    },
    [navigate],
  );

  const startTour = useCallback(() => {
    tourRef.current = 0;
    tourVisited.current = false;
    setTourStep(0);
    setTourOffer(false);
    setTourEnded(false);
    setMenuOpen(false);
    rememberTour();
    navigate(null);
  }, [navigate]);
  const stopTour = useCallback(() => {
    tourRef.current = null;
    tourVisited.current = false;
    setTourStep(null);
    setTourOffer(false);
    rememberTour();
    navigate(null);
  }, [navigate]);
  const advanceTour = useCallback((step: number) => {
    tourVisited.current = false;
    if (step < TOUR.length - 1) {
      tourRef.current = step + 1;
      setTourStep(step + 1);
    } else {
      tourRef.current = null;
      setTourStep(null);
      setTourEnded(true);
    }
  }, []);
  const skipStep = useCallback(() => {
    if (tourRef.current !== null) advanceTour(tourRef.current);
  }, [advanceTour]);

  // A step counts once its section was opened and then left.
  useEffect(() => {
    const step = tourRef.current;
    if (step !== null) {
      if (route.spot === TOUR[step].spot) tourVisited.current = true;
      else if (tourVisited.current) {
        advanceTour(step);
        if (route.spot && route.spot === TOUR[step + 1]?.spot) tourVisited.current = true;
      }
    }
    if (route.spot) {
      setTourOffer((offer) => {
        if (offer) rememberTour();
        return false;
      });
      setTourEnded(false);
    }
  }, [route.spot, advanceTour]);

  useEffect(() => {
    if (!flat || tourRef.current === null) return;
    tourRef.current = null;
    setTourStep(null);
  }, [flat]);

  useEffect(() => {
    if (!tourEnded) return;
    const timer = setTimeout(() => setTourEnded(false), 8000);
    return () => clearTimeout(timer);
  }, [tourEnded]);

  useEffect(() => {
    const looked = () => setHasLooked(true);
    window.addEventListener("pointerdown", looked, { once: true });
    return () => window.removeEventListener("pointerdown", looked);
  }, []);

  useEffect(() => {
    if (!sceneOn) return;
    const timers = [
      setTimeout(() => setSceneStarted(true), LOADER_PAINT_MS),
      setTimeout(() => setLoadStep(1), LOADER_MS * 0.34),
      setTimeout(() => setLoadStep(2), LOADER_MS * 0.68),
      setTimeout(() => setMinTimeDone(true), LOADER_MS),
    ];
    return () => timers.forEach(clearTimeout);
  }, [sceneOn, sceneKey]);

  useEffect(() => {
    if (!finishing) return;
    const timer = setTimeout(() => setReady(true), LOADER_FINISH_MS);
    return () => clearTimeout(timer);
  }, [finishing]);

  useEffect(() => {
    if (!burst) return;
    const timer = setTimeout(() => setBurst(null), BURST_MS);
    return () => clearTimeout(timer);
  }, [burst]);

  useEffect(() => {
    if (!secret) return;
    const timer = setTimeout(() => setSecret(null), 9000);
    return () => clearTimeout(timer);
  }, [secret]);

  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSecret(null);
      if (event.key === "Escape") setMenuOpen(false);
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [close]);

  const labelOf = useCallback(
    (key: string) => {
      if (key === "curtain") return (day ? UI.closeCurtain : UI.openCurtain)[lang];
      if (key === "pc") return UI.turnOnPc[lang];
      if (key === "chair") return UI.spinChair[lang];
      if (key === "monitor-terminal") return "Terminal";
      if (key === "monitor-github") return "GitHub";
      return SPOTS.find((item) => item.id === key)?.label[lang] ?? key;
    },
    [lang, day],
  );

  const onSecret = useCallback((id: SecretId, x: number, y: number) => setSecret((open) => (open?.id === id ? null : { id, x, y })), []);
  const toggleDay = useCallback(() => setDay((value) => !value), []);
  const onReady = useCallback(() => setSceneBuilt(true), []);
  const onFail = useCallback(() => {
    // The graphics context really died: drop this scene so the next visit builds a new one.
    setFlat(true);
    setSceneOn(false);
    setSceneStarted(false);
    setSceneBuilt(false);
    setMinTimeDone(false);
    setReady(false);
    setLoadStep(0);
    setSceneKey((key) => key + 1);
  }, []);
  const onScore = useCallback((kind: ScoreKind, x: number, y: number) => setBurst({ id: performance.now(), kind, x, y }), []);
  const toggleFlat = () => {
    setSceneOn(true);
    setFlat((value) => !value);
  };
  const onHover = useCallback((label: string | null) => setHover(label), []);
  const onSelect = useCallback((spot: SpotId, slug?: string) => navigate(spot, slug), [navigate]);
  const tourSpot = tourStep === null ? null : TOUR[tourStep].spot;

  return (
    <div className={`app${flat ? " is-flat" : ""}${route.spot ? " has-panel" : ""}${!flat && route.spot === "monitor" ? " is-wide" : ""}${!flat && !ready ? " is-loading" : ""}`}>
      {sceneOn && (
        <div className="stage">
          {sceneStarted && (
            <SceneBoundary key={`scene-${sceneKey}`} onFail={onFail}>
              <Suspense fallback={null}>
                <Scene focus={flat ? null : route.spot} day={day} onToggleDay={toggleDay} labelOf={labelOf} onSelect={toggleRoute} onHover={onHover} onSecret={onSecret} onScore={onScore} onReady={onReady} onFail={onFail} tourTarget={!flat && ready && !route.spot ? tourSpot : null} />
              </Suspense>
            </SceneBoundary>
          )}
          <Loader key={`loader-${sceneKey}`} lang={lang} step={finishing ? 3 : loadStep} finishing={finishing} done={ready} />
        </div>
      )}

      <header className="topbar">
        <button className="brand" onClick={close}>
          <strong>Vitor Gonzaga</strong>
          <span>{ABOUT.role[lang]}</span>
        </button>
        <div className="top-actions">
          {!flat && (
            <button className="pill tour-pill" title={UI.tour[lang]} aria-label={UI.tour[lang]} onClick={startTour}>
              <span aria-hidden="true">▸</span>
              <span className="long">{UI.tour[lang]}</span>
            </button>
          )}
          <ThemeSwitch day={day} lang={lang} onToggle={toggleDay} />
          <button className="pill" onClick={toggleFlat} disabled={!hasWebGL}>
            {flat ? <RoomIcon /> : <ReadingIcon />}
            <span className="long">{flat ? UI.room[lang] : UI.simple[lang]}</span>
          </button>
          <button className="pill" onClick={() => setLang(lang === "pt" ? "en" : "pt")} aria-label={lang === "pt" ? "Switch to English" : "Mudar para português"}>
            {lang === "pt" ? "EN" : "PT"}
          </button>
        </div>
        {!flat && (
          <button className="menu-button" aria-label={UI.menu[lang]} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
          </button>
        )}
      </header>

      {flat ? (
        <FlatVersion lang={lang} route={route} onProject={onSelect} />
      ) : (
        <>
          <nav className="dock" aria-label={UI.hint[lang]}>
            <p><span className="hint-wide">{UI.hint[lang]}</span><span className="hint-narrow">{UI.hintPortrait[lang]}</span></p>
            <div>
              {SPOTS.filter((spot) => spot.nav).map((spot) => (
                <button key={spot.id} className={route.spot === spot.id ? "active" : ""} aria-current={route.spot === spot.id} onClick={() => toggleRoute(spot.id)}>
                  {spot.label[lang]}
                </button>
              ))}
            </div>
          </nav>
          {route.spot && <Panel route={route as Route & { spot: SpotId }} lang={lang} onClose={close} onNavigate={onSelect} />}
          <Tooltip label={hover} />
          {menuOpen && (
            <div className="mobile-menu">
              <button className="button" onClick={startTour}>▸ {UI.tour[lang]}</button>
              <nav aria-label={UI.hint[lang]}>
                {SPOTS.filter((spot) => spot.nav).map((spot) => (
                  <button key={spot.id} onClick={() => { setMenuOpen(false); navigate(spot.id); }}>{spot.label[lang]}</button>
                ))}
              </nav>
              <div>
                <ThemeSwitch day={day} lang={lang} onToggle={toggleDay} />
                <button className="pill" onClick={toggleFlat}><ReadingIcon />{UI.simple[lang]}</button>
                <button className="pill" onClick={() => setLang(lang === "pt" ? "en" : "pt")}>{lang === "pt" ? "EN" : "PT"}</button>
              </div>
            </div>
          )}
          {!hasLooked && ready && !route.spot && !tourOffer && tourStep === null && !tourEnded && <p className="look-hint">{UI.lookHint[lang]}</p>}
          {tourOffer && ready && !route.spot && (
            <section className="tour-offer" role="dialog" aria-label={UI.tour[lang]}>
              <p>{UI.tourInvite[lang]}</p>
              <div className="tour-actions">
                <button className="button ghost" onClick={stopTour}>{UI.tourSkip[lang]}</button>
                <button className="button" onClick={startTour}>{UI.tourStart[lang]} →</button>
              </div>
            </section>
          )}
          {tourStep !== null && !route.spot && ready && <TourCard step={tourStep} lang={lang} onSkip={skipStep} onStop={stopTour} />}
          {tourStep !== null && route.spot === tourSpot && (
            <div className="tour-chip" role="status">
              <span>{forDevice(UI.tourContinue[lang])}</span>
              <button onClick={stopTour} aria-label={UI.tourStop[lang]}>✕</button>
            </div>
          )}
          {tourEnded && (
            <section className="tour-offer" role="status">
              <p>{UI.tourEnd[lang]}</p>
              <div className="tour-actions">
                <button className="button" onClick={() => setTourEnded(false)}>{UI.tourEndButton[lang]} →</button>
              </div>
            </section>
          )}
          {secret && !route.spot && <SecretCard secret={secret} lang={lang} onClose={() => setSecret(null)} />}
          {burst && <ScoreBurst key={burst.id} burst={burst} lang={lang} />}
        </>
      )}
    </div>
  );
}
