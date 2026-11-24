export interface Localized {
  pt: string;
  en: string;
}

export type ProjectStatus = "live" | "in_progress" | "research" | "confidential";

export interface ProjectLink {
  label: Localized;
  url: string;
}

export interface ProjectDetail {
  summary: Localized;
  overview: Localized;
  stack: Array<{ label: string; items: string[] }>;
  links: ProjectLink[];
}

export interface Project {
  slug: string;
  title: Localized;
  /** Subtitle under the title, e.g. "2026 / Java · Spring Boot". */
  meta: string;
  status: ProjectStatus;
  link?: string;
  detail?: ProjectDetail;
}

const same = (text: string): Localized => ({ pt: text, en: text });

export const PROJECTS: Project[] = [
  {
    slug: "fincore",
    title: same("FinCore"),
    meta: "2026 / Java · Spring Boot · PostgreSQL · Flyway · Testcontainers",
    status: "in_progress",
    detail: {
      summary: {
        pt: "Uma API financeira que criei para aprender, na prática, o que muda quando o backend lida com dinheiro: consistência, transações, concorrência e idempotência.",
        en: "A financial API I built to learn, hands-on, what changes when a backend handles money: consistency, transactions, concurrency and idempotency.",
      },
      overview: {
        pt: "É um monólito organizado por funcionalidade. Só coloco uma tecnologia nova quando aparece um problema real que justifique, então cada peça da stack tem um motivo para estar ali. Por enquanto, a API cuida das contas, com um contrato JSON rígido e documentação no Swagger.",
        en: "It's a monolith organized by feature. I only add a new technology when a real problem calls for it, so every piece of the stack has a reason to be there. For now the API handles accounts, with a strict JSON contract and Swagger docs.",
      },
      stack: [
        { label: "Backend", items: ["Java 25", "Spring Boot 4.1", "Spring Web MVC", "Bean Validation", "springdoc-openapi"] },
        { label: "Data", items: ["PostgreSQL 18", "Spring Data JPA", "Hibernate", "Flyway"] },
        { label: "Quality", items: ["JUnit", "AssertJ", "Mockito", "Testcontainers", "GitHub Actions"] },
      ],
      links: [{ label: same("GitHub"), url: "https://github.com/vitortgonzaga/FinCore" }],
    },
  },
  {
    slug: "rumo",
    title: same("Rumo"),
    meta: "2026 / Java · Spring Boot · PostgreSQL · Docker · JWT",
    status: "in_progress",
    detail: {
      summary: {
        pt: "Um SaaS que monta roadmaps de estudo com IA em formato de mapa mental. Você conta o que quer aprender e recebe um plano semana a semana, com tópicos, explicações e material.",
        en: "A SaaS that builds AI study roadmaps shaped like a mind map. You say what you want to learn and get a week-by-week plan with topics, explanations and material.",
      },
      overview: {
        pt: "A base do Rumo é uma API em Java com Spring Boot, dividida em autenticação, usuários, créditos e e-mail. Como o produto funciona com créditos, conta e saldo precisam estar sempre certos. O ambiente inteiro sobe com Docker Compose, do mesmo jeito que roda no servidor.",
        en: "Rumo runs on a Java API built with Spring Boot, split into auth, users, credits and email. Since the product works on credits, accounts and balances always have to be right. The whole environment comes up with Docker Compose, the same way it runs on the server.",
      },
      stack: [
        { label: "Backend", items: ["Java 21", "Spring Boot 4", "Spring Security", "OAuth2 Resource Server", "Spring Mail"] },
        { label: "Data", items: ["PostgreSQL", "Spring Data JPA", "Flyway"] },
        { label: "Infra & Quality", items: ["Docker", "Docker Compose", "Mailpit", "Testcontainers", "JUnit"] },
      ],
      links: [{ label: { pt: "Ver o site", en: "Visit site" }, url: "https://rumo-seven-beta.vercel.app" }],
    },
  },
  {
    slug: "fundlens",
    title: same("FundLens"),
    meta: "2026 / Python · SQL · CVM Open Data",
    status: "in_progress",
    detail: {
      summary: {
        pt: "Meu projeto de engenharia de dados com os dados abertos de fundos de investimento da CVM. O objetivo é pegar arquivos públicos, grandes e bagunçados, e transformar em tabelas confiáveis e um dashboard.",
        en: "My data engineering project using CVM's open data on investment funds. The goal is to take large, messy public files and turn them into reliable tables and a dashboard.",
      },
      overview: {
        pt: "Juntei duas coisas de que gosto, dados e mercado financeiro. A CVM publica todo dia patrimônio, cota, captações, resgates e número de cotistas de cada fundo. Estou construindo por etapas, sempre medindo o resultado de cada uma.",
        en: "It brings together two things I like, data and financial markets. CVM publishes each fund's net equity, quota value, subscriptions, redemptions and shareholders every day. I'm building it in stages, measuring the result of each one.",
      },
      stack: [{ label: "Data", items: ["Python", "SQL", "CVM Open Data"] }],
      links: [{ label: same("GitHub"), url: "https://github.com/vitortgonzaga/FundLens" }],
    },
  },
  {
    slug: "pixel-forge",
    title: same("Pixel Forge"),
    meta: "2025–2026 / Next.js · TypeScript · Three.js · p5.js",
    status: "live",
    link: "https://www.pixelforge3d.com.br",
    detail: {
      summary: {
        pt: "Uma plataforma para aprender Computação Gráfica, Multimídia e Inteligência Computacional mexendo nos conceitos direto no navegador.",
        en: "A platform for learning Computer Graphics, Multimedia and Computational Intelligence by playing with the concepts right in the browser.",
      },
      overview: {
        pt: "Fiz no Inatel para que o conteúdo da sala de aula virasse algo que dá para ver e testar em tempo real. A primeira versão ganhou o 1º lugar em Impacto Social na FETIN 2025, e a plataforma já foi usada por cerca de 200 estudantes do Inatel.",
        en: "I built it at Inatel, so classroom content could become something you can see and try in real time. The first version won 1st place in Social Impact at FETIN 2025, and about 200 Inatel students have used the platform.",
      },
      stack: [
        { label: "Frontend", items: ["Next.js", "React", "TypeScript", "Tailwind CSS"] },
        { label: "Graphics", items: ["Three.js", "p5.js"] },
        { label: "Quality", items: ["Playwright"] },
      ],
      links: [
        { label: { pt: "Ver o site", en: "Visit site" }, url: "https://www.pixelforge3d.com.br" },
        { label: same("GitHub"), url: "https://github.com/vitortgonzaga/PixelForge" },
      ],
    },
  },
  {
    slug: "groovetree",
    title: same("Groovetree"),
    meta: "2025 / Next.js",
    status: "live",
    link: "https://groovetr.ee",
  },
  {
    slug: "iot-ingestion",
    title: { pt: "Ingestão de IoT em tempo real", en: "Real-time IoT ingestion" },
    meta: "Multittech · 2025 / Python · AWS EC2 · SQL",
    status: "confidential",
  },
  {
    slug: "eye-tracking",
    title: { pt: "Rastreamento ocular assistivo", en: "Assistive eye tracking" },
    meta: "eHealth Inatel · 2024 / Python · Dart · Computer Vision",
    status: "research",
    link: "assets/ARTIGO_ELA.pdf",
  },
  {
    slug: "etl-pipelines",
    title: { pt: "Pipelines de ETL e integrações", en: "ETL pipelines and integrations" },
    meta: "Multittech · 2025 / Python · REST APIs",
    status: "confidential",
  },
];
