import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import contributions from "../content/contributions.json";
import { PROJECTS } from "../content/projects";
import { FEATURES } from "../features";
import { ABOUT, CERTIFICATION, CONTACT, EXPERIENCE, RESUMES, STACK, type Lang, type SpotId } from "../content/site";
import { EXTRAS } from "./SpotContent";

type Tab = "terminal" | "github";

interface PanelProps {
  lang: Lang;
  onProject: (spot: SpotId, slug?: string) => void;
}

const COPY = {
  terminal: { pt: "Terminal", en: "Terminal" },
  github: { pt: "GitHub", en: "GitHub" },
};

function TabIcon({ id }: { id: Tab }) {
  if (id === "terminal") {
    return (
      <svg className="tab-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="m5 7 5 5-5 5M12.5 18H19" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg className="tab-icon" viewBox="0 0 16 16" aria-hidden="true">
      <path fill="currentColor" fillRule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

export default function MonitorPanel({ lang, onProject, initialTab }: PanelProps & { initialTab?: string }) {
  const requested: Tab = initialTab === "github" ? "github" : "terminal";
  const [tab, setTab] = useState<Tab>(requested);
  useEffect(() => setTab(requested), [requested]);
  return (
    <>
      <div className="monitor-tabs" role="tablist">
        {(["terminal", "github"] as Tab[]).map((id) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(tab === id ? "terminal" : id)}>
            <TabIcon id={id} />
            {COPY[id][lang]}
          </button>
        ))}
      </div>
      {tab === "terminal" && <TerminalTab lang={lang} onProject={onProject} onGithub={() => setTab("github")} />}
      {tab === "github" && <GithubTab lang={lang} />}
    </>
  );
}

/* ---------------------------------- Terminal ---------------------------------- */

interface Line {
  text: string;
  tone?: "cmd" | "dim" | "err" | "ok";
  href?: string;
}

const COMMANDS = ["help", "whoami", "projects", "open", "experience", "stack", "education", "contact", "resume", "github", ...(FEATURES.dogs ? ["pets"] : []), "clear"];

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
const findProject = (name: string) => PROJECTS.find((project) => normalize(project.slug) === normalize(name) || normalize(project.title.en) === normalize(name));

function TerminalTab({ lang, onProject, onGithub }: PanelProps & { onGithub: () => void }) {
  const pt = lang === "pt";
  const [lines, setLines] = useState<Line[]>(() => [
    { text: pt ? "Bem-vindo ao meu terminal." : "Welcome to my terminal.", tone: "ok" },
    { text: pt ? "Digite help para ver os comandos." : "Type help to see the commands.", tone: "dim" },
  ]);
  const [value, setValue] = useState("");
  const history = useRef<string[]>([]);
  const cursor = useRef(-1);
  const log = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight });
  }, [lines]);

  useEffect(() => {
    if (!matchMedia("(pointer: fine)").matches) return;
    const timer = setTimeout(() => input.current?.focus({ preventScroll: true }), 80);
    return () => clearTimeout(timer);
  }, []);

  const respond = (raw: string): Line[] | null => {
    const [command = "", ...args] = raw.trim().split(/\s+/);
    const name = command.toLowerCase();
    switch (name === "pets" && !FEATURES.dogs ? "unknown" : name) {
      case "":
        return [];
      case "help":
        return [
          ["whoami", pt ? "quem sou eu" : "who I am"],
          ["projects", pt ? "lista os projetos" : "list my projects"],
          ["open <projeto>", pt ? "abre um projeto" : "open a project"],
          ["experience", pt ? "onde já trabalhei" : "where I've worked"],
          ["stack", pt ? "o que uso" : "what I use"],
          ["education", pt ? "formação" : "education"],
          ["resume", pt ? "currículos em PDF" : "PDF resumes"],
          ["contact", pt ? "como falar comigo" : "how to reach me"],
          ["github", pt ? "abre a aba do GitHub" : "open the GitHub tab"],
          ["clear", pt ? "limpa a tela" : "clear the screen"],
        ].map(([name, text]) => ({ text: `${name.padEnd(16)}${text}` }));
      case "whoami":
        return [{ text: "Vitor Gonzaga", tone: "ok" }, { text: ABOUT.role[lang] }, { text: ABOUT.lead[lang], tone: "dim" }];
      case "ls":
      case "projects":
        return [
          ...PROJECTS.map((project) => ({ text: `${project.slug.padEnd(16)}${project.meta.split(" / ")[1] ?? project.meta}`, tone: EXTRAS.includes(project.slug) ? ("dim" as const) : undefined })),
          { text: pt ? "Use: open rumo" : "Try: open rumo", tone: "ok" },
        ];
      case "open": {
        const project = findProject(args.join(" "));
        if (!project) return [{ text: pt ? "Projeto não encontrado. Veja a lista com: projects" : "Project not found. See the list with: projects", tone: "err" }];
        onProject(EXTRAS.includes(project.slug) ? "extras" : "trophies", project.slug);
        return null;
      }
      case "experience":
        return EXPERIENCE.flatMap((job) => [{ text: job.company, tone: "ok" as const }, { text: `${job.role[lang]} · ${job.date[lang]}`, tone: "dim" as const }]);
      case "stack":
        return STACK.map((group) => ({ text: `${group.title[lang].padEnd(17)}${group.items.join(", ")}` }));
      case "education":
        return [
          { text: pt ? "Engenharia de Software · Inatel · 2022 a 2027" : "Software Engineering · Inatel · 2022 to 2027" },
          { text: CERTIFICATION.name, tone: "ok" },
        ];
      case "resume":
        return RESUMES.flatMap((resume) => [
          { text: `${resume.title[lang]} (PT)`, href: `${import.meta.env.BASE_URL}assets/curriculos/${resume.pt}` },
          { text: `${resume.title[lang]} (EN)`, href: `${import.meta.env.BASE_URL}assets/curriculos/${resume.en}` },
        ]);
      case "contact":
        return [{ text: CONTACT.email, href: `mailto:${CONTACT.email}` }, ...CONTACT.links.map((link) => ({ text: link.label, href: link.url }))];
      case "github":
        onGithub();
        return null;
      case "pets":
        return [{ text: pt ? "Tem uma Spitz e um Yorkshire dormindo embaixo da mesa. Fala baixo." : "There's a Spitz and a Yorkshire asleep under the desk. Keep it down.", tone: "ok" }];
      case "sudo":
        return [{ text: pt ? "Boa tentativa. Mas pode me contratar sem sudo." : "Nice try. You can hire me without sudo, though.", tone: "ok" }];
      case "clear":
        setLines([]);
        return null;
      default:
        return [{ text: pt ? `Comando não encontrado: ${command}. Digite help.` : `Command not found: ${command}. Type help.`, tone: "err" }];
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const raw = value;
    setValue("");
    cursor.current = -1;
    if (raw.trim()) history.current.unshift(raw);
    const output = respond(raw);
    if (output === null) return;
    setLines((current) => [...current, { text: raw, tone: "cmd" }, ...output]);
  };

  const onKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      const step = event.key === "ArrowUp" ? 1 : -1;
      const next = Math.max(-1, Math.min(history.current.length - 1, cursor.current + step));
      cursor.current = next;
      setValue(next === -1 ? "" : history.current[next]);
    }
    if (event.key === "Tab") {
      event.preventDefault();
      const typed = value.toLowerCase();
      if (typed.startsWith("open ")) {
        const part = normalize(typed.slice(5));
        const match = PROJECTS.find((project) => normalize(project.slug).startsWith(part));
        if (match) setValue(`open ${match.slug}`);
      } else {
        const match = COMMANDS.find((command) => command.startsWith(typed));
        if (match) setValue(match);
      }
    }
  };

  return (
    <div className="term" onClick={() => { if (!getSelection()?.toString()) input.current?.focus({ preventScroll: true }); }}>
      <div className="term-log" ref={log} role="log" aria-live="polite">
        {lines.map((line, i) =>
          line.href ? (
            <p key={i}><a href={line.href} target={line.href.startsWith("mailto") ? undefined : "_blank"} rel="noopener">{line.text} ↗</a></p>
          ) : (
            <p key={i} className={line.tone}>{line.text}</p>
          ),
        )}
      </div>
      <form onSubmit={submit}>
        <span aria-hidden="true">$</span>
        <input
          ref={input}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={onKey}
          aria-label={pt ? "Digite um comando" : "Type a command"}
          placeholder="help"
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
      </form>
    </div>
  );
}

/* ----------------------------------- GitHub ----------------------------------- */

const GITHUB_URL = "https://github.com/vitortgonzaga";

function ContributionGraph({ lang }: { lang: Lang }) {
  const pt = lang === "pt";
  const locale = pt ? "pt-BR" : "en-US";
  const scroller = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<string | null>(null);

  const { cells, months, weeks } = useMemo(() => {
    const offset = new Date(`${contributions.days[0][0]}T12:00:00`).getDay();
    const placed = contributions.days.map(([date, level, count], index) => {
      const slot = index + offset;
      return { date: date as string, level: level as number, count: count as number, column: Math.floor(slot / 7), row: slot % 7 };
    });
    const labels: Array<{ column: number; text: string }> = [];
    let previous = -1;
    placed.forEach((cell) => {
      const day = new Date(`${cell.date}T12:00:00`);
      if (day.getMonth() === previous || cell.row !== 0) return;
      previous = day.getMonth();
      if (cell.column < placed[placed.length - 1].column - 1) {
        labels.push({ column: cell.column, text: day.toLocaleDateString(locale, { month: "short" }).replace(".", "") });
      }
    });
    return { cells: placed, months: labels, weeks: placed[placed.length - 1].column + 1 };
  }, [locale]);

  useEffect(() => {
    if (scroller.current) scroller.current.scrollLeft = scroller.current.scrollWidth;
  }, []);

  const describe = (count: number, date: string) => {
    const when = new Date(`${date}T12:00:00`).toLocaleDateString(locale, { day: "numeric", month: "short" });
    if (pt) return `${count === 0 ? "Nenhuma" : count} ${count > 1 ? "contribuições" : "contribuição"} em ${when}`;
    return `${count === 0 ? "No" : count} ${count === 1 ? "contribution" : "contributions"} on ${when}`;
  };
  const weekdays = pt ? [["Seg", 1], ["Qua", 3], ["Sex", 5]] : [["Mon", 1], ["Wed", 3], ["Fri", 5]];

  return (
    <section className="gh-contrib">
      <h4>{pt ? `${contributions.total} contribuições no último ano` : `${contributions.total} contributions in the last year`}</h4>
      <div className="gh-scroll" ref={scroller} tabIndex={0}>
        <div
          className="gh-graph"
          role="img"
          aria-label={pt ? `Gráfico com ${contributions.total} contribuições no último ano` : `Graph of ${contributions.total} contributions in the last year`}
          style={{ gridTemplateColumns: `30px repeat(${weeks}, minmax(0, 1fr))` }}
          onMouseLeave={() => setActive(null)}
        >
          {months.map((month) => (
            <span key={`${month.text}${month.column}`} className="gh-month" style={{ gridColumn: `${month.column + 2} / span 4`, gridRow: 1 }}>{month.text}</span>
          ))}
          {weekdays.map(([text, row]) => (
            <span key={text} className="gh-weekday" style={{ gridColumn: 1, gridRow: (row as number) + 2 }}>{text}</span>
          ))}
          {cells.map((cell) => (
            <i
              key={cell.date}
              data-level={cell.level}
              title={describe(cell.count, cell.date)}
              style={{ gridColumn: cell.column + 2, gridRow: cell.row + 2 }}
              onMouseEnter={() => setActive(describe(cell.count, cell.date))}
            />
          ))}
        </div>
      </div>
      <div className="gh-legend">
        <span className="gh-active">{active ?? "\u00a0"}</span>
        <span className="gh-scale">
          {pt ? "Menos" : "Less"}
          {[0, 1, 2, 3, 4].map((level) => <i key={level} data-level={level} />)}
          {pt ? "Mais" : "More"}
        </span>
      </div>
    </section>
  );
}

function GithubTab({ lang }: { lang: Lang }) {
  const pt = lang === "pt";
  return (
    <>
      <ContributionGraph lang={lang} />
      <a className="gh-shot" href={GITHUB_URL} target="_blank" rel="noopener" aria-label={pt ? "Abrir meu perfil no GitHub" : "Open my GitHub profile"}>
        <span className="gh-bar">
          <i aria-hidden="true" />
          <i aria-hidden="true" />
          <i aria-hidden="true" />
          <span>github.com/vitortgonzaga</span>
        </span>
        <img
          src={`${import.meta.env.BASE_URL}assets/github-profile.jpg`}
          width={1400}
          height={1042}
          alt={pt ? "Print do meu perfil no GitHub, com README e repositórios fixados" : "Screenshot of my GitHub profile, with README and pinned repositories"}
        />
      </a>
      <div className="actions">
        <a className="button" href={GITHUB_URL} target="_blank" rel="noopener">{pt ? "Abrir meu GitHub" : "Open my GitHub"} ↗</a>
      </div>
    </>
  );
}
