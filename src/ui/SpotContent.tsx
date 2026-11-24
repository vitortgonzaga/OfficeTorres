import { Suspense, lazy, useState } from "react";
import { PROJECTS, type Localized, type Project } from "../content/projects";
import { ABOUT, CERTIFICATION, CONTACT, COURSEWORK, EXPERIENCE, RESUMES, STACK, UI, type Lang, type SpotId } from "../content/site";

const MonitorPanel = lazy(() => import("./MonitorPanel"));

interface Props {
  spot: SpotId;
  lang: Lang;
  slug?: string;
  onProject: (spot: SpotId, slug?: string) => void;
  /** Reading mode shows the monitor as the GitHub tab only. */
  readingMode?: boolean;
}

const statusLabel = (project: Project): Localized =>
  ({ live: UI.live, in_progress: UI.inProgress, research: UI.research, confidential: UI.confidentialTag })[project.status];

export const TROPHIES = ["rumo", "fincore", "fundlens", "pixel-forge"];
export const EXTRAS = ["groovetree", "iot-ingestion", "eye-tracking", "etl-pipelines"];

const asset = (path: string) => `${import.meta.env.BASE_URL}${path}`;
const resolveLink = (url: string) => (url.startsWith("http") ? url : asset(url));

/** In Reading mode the sections share one page, so the visitor is also scrolled to the resumes. */
function goToResume(onProject: Props["onProject"], readingMode?: boolean) {
  onProject("resume");
  if (!readingMode) return;
  const smooth = !matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.getElementById("resume")?.scrollIntoView({ block: "start", behavior: smooth ? "smooth" : "auto" });
}

function ProjectList({ spot, lang, onProject, only }: Pick<Props, "spot" | "lang" | "onProject"> & { only?: string[] }) {
  return (
    <ul className="project-list">
      {PROJECTS.filter((project) => !only || only.includes(project.slug)).map((project) => (
        <li key={project.slug}>
          <button onClick={() => onProject(spot, project.slug)}>
            <span className="project-name">{project.title[lang]}</span>
            <span className={`tag tag-${project.status}`}>{statusLabel(project)[lang]}</span>
            <small>{project.meta}</small>
          </button>
        </li>
      ))}
    </ul>
  );
}

function ProjectDetail({ project, lang }: { project: Project; lang: Lang }) {
  const detail = project.detail;
  const t = (text: Localized) => text[lang];
  return (
    <article className="project">
      <span className={`tag tag-${project.status}`}>{t(statusLabel(project))}</span>
      <h3>{t(project.title)}</h3>
      <p className="mono-note">{project.meta}</p>
      {project.status === "confidential" && <p>{t(UI.confidential)}</p>}
      {detail ? (
        <>
          <p className="lead">{t(detail.summary)}</p>
          <p>{t(detail.overview)}</p>
          <h4>Stack</h4>
          {detail.stack.map((group) => (
            <Chips key={group.label} title={group.label} items={group.items} />
          ))}
          <div className="actions">
            {detail.links.map((link) => (
              <a className="button" key={link.url} href={link.url} target="_blank" rel="noopener">{t(link.label)} ↗</a>
            ))}
          </div>
        </>
      ) : (
        project.link && (
          <div className="actions">
            <a className="button" href={resolveLink(project.link)} target="_blank" rel="noopener">{t(UI.open)} ↗</a>
          </div>
        )
      )}
    </article>
  );
}

function Chips({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="chips-group">
      <span className="chips-title">{title}</span>
      <div className="chips">{items.map((item) => <span key={item}>{item}</span>)}</div>
    </div>
  );
}

function Resumes({ lang }: { lang: Lang }) {
  return (
    <ul className="resume-list">
      {RESUMES.map((resume) => (
        <li key={resume.title.en}>
          <strong>{resume.title[lang]}</strong>
          <a className="button ghost" href={asset(`assets/curriculos/${resume.pt}`)} target="_blank" rel="noopener" aria-label={`${resume.title[lang]}, ${UI.portuguese[lang]}`}>PT ↗</a>
          <a className="button ghost" href={asset(`assets/curriculos/${resume.en}`)} target="_blank" rel="noopener" aria-label={`${resume.title[lang]}, ${UI.english[lang]}`}>EN ↗</a>
        </li>
      ))}
    </ul>
  );
}

function Contact({ lang }: { lang: Lang }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(CONTACT.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      location.href = `mailto:${CONTACT.email}`;
    }
  };
  return (
    <>
      <p>{UI.contactIntro[lang]}</p>
      <a className="email" href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
      <div className="actions">
        <button className="button" onClick={copy} aria-live="polite">{copied ? UI.copied[lang] : UI.copy[lang]}</button>
        {CONTACT.links.map((link) => (
          <a className="button ghost" key={link.url} href={link.url} target="_blank" rel="noopener">{link.label} ↗</a>
        ))}
      </div>
    </>
  );
}

export function SpotContent({ spot, lang, slug, onProject, readingMode }: Props) {
  const t = (text: Localized) => text[lang];
  const project = slug ? PROJECTS.find((item) => item.slug === slug) : undefined;
  if (project) return <ProjectDetail project={project} lang={lang} />;

  switch (spot) {
    case "about":
      return (
        <>
          <p className="lead">{t(ABOUT.lead)}</p>
          <p>{t(ABOUT.work)}</p>
          <p>{t(ABOUT.outside)}</p>
          <p>{t(ABOUT.education)}</p>
          <div className="actions">
            <button className="button" onClick={() => goToResume(onProject, readingMode)}>{t(UI.learnMore)} →</button>
          </div>
        </>
      );
    case "monitor":
      return (
        <Suspense fallback={<p className="mono-note">{t(UI.loading)}</p>}>
          <MonitorPanel lang={lang} onProject={onProject} initialTab={slug} githubOnly={readingMode} />
        </Suspense>
      );
    case "trophies":
      return (
        <>
          <p>{t(UI.trophyHint)}</p>
          <ProjectList spot={spot} lang={lang} onProject={onProject} only={TROPHIES} />
          <button className="text-link" onClick={() => onProject("extras")}>{t(UI.seeExtras)} →</button>
        </>
      );
    case "extras":
      return (
        <>
          <p>{t(UI.extrasHint)}</p>
          <ProjectList spot={spot} lang={lang} onProject={onProject} only={EXTRAS} />
        </>
      );
    case "cork":
      return (
        <div className="timeline">
          {EXPERIENCE.map((job) => (
            <article key={job.company}>
              <h3>{job.company}</h3>
              <p className="mono-note">{t(job.role)} · {t(job.date)}</p>
              <ul>{job.points.map((point) => <li key={point.en}>{t(point)}</li>)}</ul>
            </article>
          ))}
        </div>
      );
    case "resume":
      return <Resumes lang={lang} />;
    case "stack":
      return (
        <>
          {STACK.map((group) => <Chips key={group.title.en} title={t(group.title)} items={group.items} />)}
          <Chips title={t(UI.spokenLanguages)} items={[t(UI.languages)]} />
        </>
      );
    case "diploma":
      return (
        <>
          <h3>Inatel</h3>
          <p className="lead">{t(UI.degree)}</p>
          <p className="education-years">{UI.degreeYears}</p>
          <p className="mono-note">{t(UI.degreeNote)}</p>
          <h4>{t(UI.courseworkTitle)}</h4>
          {COURSEWORK.map((group) => <Chips key={group.title.en} title={t(group.title)} items={group.items.map(t)} />)}
        </>
      );
    case "certification":
      return (
        <>
          <h3>{CERTIFICATION.name}</h3>
          <p className="mono-note">{CERTIFICATION.issuer} · {t(CERTIFICATION.date)}</p>
          <div className="actions">
            <a className="button" href={CERTIFICATION.url} target="_blank" rel="noopener">{t(UI.credential)} ↗</a>
          </div>
          <h4>{t(UI.certCoversTitle)}</h4>
          <div className="chips">{CERTIFICATION.covers.map((item) => <span key={item.en}>{t(item)}</span>)}</div>
        </>
      );
    case "paper":
      return (
        <>
          <h3>{t(UI.paperTitle)}</h3>
          <p className="mono-note">INCITEL 2025</p>
          <p>{t(UI.paperText)}</p>
          <div className="actions">
            <a className="button" href={asset("assets/ARTIGO_ELA.pdf")} target="_blank" rel="noopener">{t(UI.readArticle)} ↗</a>
          </div>
        </>
      );
    case "phone":
      return <Contact lang={lang} />;
  }
}
