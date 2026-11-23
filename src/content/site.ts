import type { Localized } from "./projects";

export type Lang = "pt" | "en";

export type SpotId =
  | "about"
  | "monitor"
  | "cork"
  | "stack"
  | "resume"
  | "phone"
  | "trophies"
  | "extras"
  | "diploma"
  | "certification"
  | "paper";

export interface Spot {
  id: SpotId;
  /** The object in the office. */
  object: Localized;
  /** What the visitor finds there, also used as the label on the object. */
  label: Localized;
  /** Main sections get a button in the navigation dock. */
  nav?: boolean;
}

export const SPOTS: Spot[] = [
  { id: "about", nav: true, object: { pt: "MacBook", en: "MacBook" }, label: { pt: "Sobre", en: "About" } },
  { id: "trophies", nav: true, object: { pt: "Troféus", en: "Trophies" }, label: { pt: "Projetos principais", en: "Main projects" } },
  { id: "monitor", nav: true, object: { pt: "Monitor", en: "Monitor" }, label: { pt: "Monitor", en: "Monitor" } },
  { id: "cork", nav: true, object: { pt: "Mural", en: "Corkboard" }, label: { pt: "Experiência", en: "Experience" } },
  { id: "stack", nav: true, object: { pt: "Flâmula", en: "Pennant" }, label: { pt: "Stack", en: "Stack" } },
  { id: "resume", nav: true, object: { pt: "Currículos", en: "Resumes" }, label: { pt: "Currículo", en: "Resume" } },
  { id: "phone", nav: true, object: { pt: "Celular", en: "Phone" }, label: { pt: "Contato", en: "Contact" } },
  { id: "extras", object: { pt: "Gaveta", en: "Drawer" }, label: { pt: "Outros projetos", en: "Other projects" } },
  { id: "diploma", object: { pt: "Diploma", en: "Diploma" }, label: { pt: "Formação", en: "Education" } },
  { id: "certification", object: { pt: "Certificado", en: "Certificate" }, label: { pt: "Certificação", en: "Certification" } },
  { id: "paper", object: { pt: "Artigo", en: "Paper" }, label: { pt: "Artigo", en: "Paper" } },
];

export const ABOUT = {
  role: { pt: "Engenheiro de Software · Backend e Dados", en: "Software Engineer · Backend and Data" },
  lead: {
    pt: "Engenheiro de Software focado em backend, trabalhando com sistemas em produção e expandindo para engenharia de dados.",
    en: "Backend-focused Software Engineer working on production systems, now expanding into data engineering.",
  },
  work: {
    pt: "No trabalho, desenvolvo funcionalidades e integrações para uma plataforma que atende um cliente do setor de fidelidade: APIs REST, JavaScript e Elasticsearch, em um sistema que processa cerca de 1 milhão de requisições por mês. Antes disso, construí pipelines de ingestão de dados em Python rodando na AWS.",
    en: "At work, I build features and integrations for a platform serving a client in the loyalty sector: REST APIs, JavaScript and Elasticsearch, in a system handling around 1M requests per month. Before that, I built data ingestion pipelines in Python running on AWS.",
  },
  outside: {
    pt: "Fora do trabalho, estou me aprofundando em backend com Java e Spring Boot no FinCore, um ledger de pagamentos open source que estou construindo com PostgreSQL, Flyway, Testcontainers e CI. Em paralelo, construo um projeto de engenharia de dados focado em Python, SQL e pipelines.",
    en: "Outside work, I'm going deeper into backend with Java and Spring Boot through FinCore, an open-source payments ledger I'm building with PostgreSQL, Flyway, Testcontainers and CI. In parallel, I'm building a data engineering project focused on Python, SQL and pipelines.",
  },
  careTitle: { pt: "O que mais me importa", en: "What I care about most" },
  care: [
    { pt: "Design de APIs", en: "API design" },
    { pt: "Testes", en: "Testing" },
    { pt: "Consistência de dados", en: "Data consistency" },
    { pt: "Observabilidade", en: "Observability" },
    { pt: "Como sistemas se comportam ao crescer", en: "How systems behave as they grow" },
  ] as Localized[],
  aiTitle: { pt: "Engenharia de IA", en: "AI engineering" },
  ai: {
    pt: "Sou AWS Certified AI Practitioner, estudei Inteligência Computacional no Inatel e aplico IA em produto no Rumo, um SaaS que gera roadmaps de estudo personalizados.",
    en: "I'm AWS Certified AI Practitioner, studied Computational Intelligence at Inatel and apply AI in a real product with Rumo, a SaaS that generates personalized study roadmaps.",
  },
  education: {
    pt: "Estou concluindo o bacharelado em Engenharia de Software no Inatel, onde também trabalhei em um sistema de rastreamento ocular para ajudar pessoas com ELA a interagir com o ambiente.",
    en: "I'm finishing my B.Sc. in Software Engineering at Inatel, where I also worked on an eye-tracking system to help people with ALS interact with their environment.",
  },
  place: { pt: "Moro em Guaratinguetá, SP. Falo português e inglês (B2).", en: "I live in Guaratinguetá, Brazil. I speak Portuguese and English (B2)." },
};

export const EXPERIENCE: Array<{ company: string; role: Localized; date: Localized; points: Localized[] }> = [
  {
    company: "LEVTY",
    role: { pt: "Engenheiro de Software Trainee", en: "Software Engineer Trainee" },
    date: { pt: "mar. 2026 até hoje", en: "Mar 2026 to present" },
    points: [
      {
        pt: "Desenvolvo soluções na plataforma SYDLE ONE para um cliente de fidelidade com 61 milhões de usuários, com regras de negócio e automações de CRM, BPM e analytics.",
        en: "I build solutions on the SYDLE ONE platform for a loyalty client with 61 million users, covering business rules and CRM, BPM and analytics automations.",
      },
      {
        pt: "Cuido de integrações que somam cerca de 1 milhão de requisições por mês, com resposta média de 200 ms.",
        en: "I work on integrations that handle about 1 million requests a month, with a 200 ms average response time.",
      },
      {
        pt: "Acompanho o trabalho do começo ao fim, da conversa com o cliente ao suporte em produção.",
        en: "I follow the work from start to finish, from talking with the client to supporting it in production.",
      },
    ],
  },
  {
    company: "Multittech Engenharia",
    role: { pt: "Estagiário de Desenvolvimento Backend", en: "Backend Development Intern" },
    date: { pt: "abr. 2025 a fev. 2026", en: "Apr 2025 to Feb 2026" },
    points: [
      {
        pt: "Criei um fluxo de ingestão de dados em tempo real com Python, AWS e SQL, com latência abaixo de 150 ms.",
        en: "I created a real-time data ingestion flow with Python, AWS and SQL, with latency under 150 ms.",
      },
      {
        pt: "Automatizei pipelines ETL e integrações para relatórios, cortando cerca de 80% da digitação manual.",
        en: "I automated ETL pipelines and integrations for reports, cutting about 80% of manual data entry.",
      },
    ],
  },
  {
    company: "eHealth Innovation Center, Inatel",
    role: { pt: "Pesquisador e Desenvolvedor", en: "Researcher and Developer" },
    date: { pt: "nov. 2023 a jan. 2025", en: "Nov 2023 to Jan 2025" },
    points: [
      {
        pt: "Ajudei a criar um sistema para pessoas com ELA se comunicarem só com o olhar, usando a câmera do computador, como alternativa a equipamentos de US$ 2 mil a 10 mil.",
        en: "I helped create a system that lets people with ALS communicate using only their eyes and a computer camera, as an alternative to devices costing US$2k to 10k.",
      },
      {
        pt: "Fiz a interface em Flutter, com teclado virtual e mensagens rápidas pelo Telegram.",
        en: "I built the Flutter interface, with a virtual keyboard and quick Telegram messages.",
      },
    ],
  },
];

export const STACK: Array<{ title: Localized; items: string[] }> = [
  { title: { pt: "Linguagens", en: "Languages" }, items: ["Java", "JavaScript", "TypeScript", "Python", "SQL"] },
  { title: { pt: "Backend e dados", en: "Backend and data" }, items: ["Spring Boot", "APIs REST", "PostgreSQL", "MongoDB", "Redis", "Elasticsearch"] },
  { title: { pt: "Cloud e DevOps", en: "Cloud and DevOps" }, items: ["AWS", "Docker", "GitHub Actions", "Git", "Linux", "Jenkins"] },
  { title: { pt: "Frontend", en: "Frontend" }, items: ["React", "Next.js", "HTML", "CSS"] },
];

/** The guided tour. The visitor clicks each object in this order. */
export const TOUR: Array<{ spot: SpotId; text: Localized }> = [
  { spot: "about", text: { pt: "Primeiro, me conheça melhor: clique no MacBook.", en: "First, get to know me: click the MacBook." } },
  { spot: "stack", text: { pt: "Agora veja com o que eu trabalho: clique na flâmula.", en: "Now see what I work with: click the pennant." } },
  { spot: "cork", text: { pt: "Por onde eu já passei? Clique no quadro de experiências.", en: "Where have I worked? Click the experience board." } },
  { spot: "trophies", text: { pt: "Estes são os projetos de que mais me orgulho: clique na estante.", en: "These are the projects I'm proudest of: click the shelf." } },
  { spot: "resume", text: { pt: "Quer levar tudo isso com você? Clique nos currículos.", en: "Want to take all this with you? Click the resumes." } },
  { spot: "phone", text: { pt: "Gostou? Vamos conversar: clique no celular.", en: "Liked it? Let's talk: click the phone." } },
];

/** Main subjects of the degree, from Inatel's official curriculum. */
export const COURSEWORK: Array<{ title: Localized; items: Localized[] }> = [
  {
    title: { pt: "Programação e algoritmos", en: "Programming and algorithms" },
    items: [
      { pt: "Algoritmos e Estrutura de Dados I, II e III", en: "Algorithms and Data Structures I, II and III" },
      { pt: "Programação Orientada a Objetos", en: "Object-Oriented Programming" },
      { pt: "Paradigmas de Programação", en: "Programming Paradigms" },
      { pt: "Linguagens de Programação e Compiladores", en: "Programming Languages and Compilers" },
      { pt: "Matemática Discreta", en: "Discrete Mathematics" },
    ],
  },
  {
    title: { pt: "Engenharia de software", en: "Software engineering" },
    items: [
      { pt: "Engenharia de Software", en: "Software Engineering" },
      { pt: "Arquitetura e Desenho de Software", en: "Software Architecture and Design" },
      { pt: "Qualidade de Software", en: "Software Quality" },
      { pt: "Engenharia de Produto de Software", en: "Software Product Engineering" },
      { pt: "Gerência de Configuração e Evolução de Software", en: "Software Configuration and Evolution Management" },
      { pt: "Interface Homem-Máquina", en: "Human-Computer Interaction" },
    ],
  },
  {
    title: { pt: "Dados e inteligência", en: "Data and intelligence" },
    items: [
      { pt: "Banco de Dados I e II", en: "Databases I and II" },
      { pt: "Análise de Dados", en: "Data Analysis" },
      { pt: "Inteligência Computacional", en: "Computational Intelligence" },
      { pt: "Probabilidade", en: "Probability" },
      { pt: "Estatística", en: "Statistics" },
      { pt: "Otimização I e II", en: "Optimization I and II" },
    ],
  },
  {
    title: { pt: "Sistemas e infraestrutura", en: "Systems and infrastructure" },
    items: [
      { pt: "Sistemas Distribuídos", en: "Distributed Systems" },
      { pt: "Sistemas Operacionais", en: "Operating Systems" },
      { pt: "Redes de Computadores", en: "Computer Networks" },
      { pt: "Gerência, QoS e Segurança em Redes", en: "Network Management, QoS and Security" },
      { pt: "Arquiteturas de Computadores", en: "Computer Architecture" },
      { pt: "Computação Gráfica e Multimídia", en: "Computer Graphics and Multimedia" },
    ],
  },
];

export const RESUMES: Array<{ title: Localized; pt: string; en: string }> = [
  { title: { pt: "Backend", en: "Backend" }, pt: "Vitor_Gonzaga_Backend_PT.pdf", en: "Vitor_Gonzaga_Backend_EN.pdf" },
  { title: { pt: "Dados", en: "Data" }, pt: "Vitor_Gonzaga_Dados_PT.pdf", en: "Vitor_Gonzaga_Data_EN.pdf" },
];

export const CONTACT = {
  email: "vitortgonzaga@gmail.com",
  links: [
    { label: "LinkedIn", url: "https://www.linkedin.com/in/vitorgonzaga10/" },
    { label: "GitHub", url: "https://github.com/vitortgonzaga" },
  ],
};

export const CERTIFICATION = {
  name: "AWS Certified AI Practitioner",
  issuer: "Amazon Web Services",
  date: { pt: "setembro de 2026", en: "September 2026" },
  url: "https://www.credly.com/badges/74878ff4-71fa-4c93-958c-4c3516a8945d/public_url",
};

export const SECRETS = {
  sports: {
    pt: "Curiosidade sobre mim: estou sempre por dentro do que acontece no mundo dos esportes.",
    en: "A fun fact about me: I always keep up with what's happening in the world of sports.",
  },
  market: {
    pt: "Curiosidade sobre mim: sou entusiasta do mercado financeiro e adoro estudar como ele funciona.",
    en: "A fun fact about me: I'm a financial markets enthusiast and I love studying how they work.",
  },
};

export type SecretId = keyof typeof SECRETS;

export const UI = {
  hint: { pt: "Clique nos objetos para explorar", en: "Click the objects to explore" },
  hintPortrait: { pt: "Toque nos objetos e arraste para os lados", en: "Tap the objects and drag sideways" },
  simple: { pt: "Modo leitura", en: "Reading mode" },
  room: { pt: "Ver escritório", en: "View office" },
  close: { pt: "Fechar", en: "Close" },
  back: { pt: "Voltar", en: "Back" },
  loading: { pt: "Arrumando o escritório", en: "Tidying up the office" },
  loadingSteps: [
    { pt: "Trazendo os móveis", en: "Bringing in the furniture" },
    { pt: "Ligando o monitor", en: "Turning on the monitor" },
    { pt: "Abrindo o escritório", en: "Opening the office" },
    { pt: "Pode entrar", en: "Come on in" },
  ],
  open: { pt: "Abrir", en: "Open" },
  copy: { pt: "Copiar e-mail", en: "Copy email" },
  copied: { pt: "Copiado!", en: "Copied!" },
  openCurtain: { pt: "Abrir cortina", en: "Open curtain" },
  closeCurtain: { pt: "Fechar cortina", en: "Close curtain" },
  contactIntro: {
    pt: "Quer falar sobre uma vaga, um projeto ou só trocar uma ideia? Me chama.",
    en: "Want to talk about a job, a project or just chat? Reach out.",
  },
  confidential: {
    pt: "Fiz esse projeto dentro da Multittech, então não posso mostrar o código.",
    en: "I built this one at Multittech, so I can't share the code.",
  },
  inProgress: { pt: "em construção", en: "in development" },
  live: { pt: "no ar", en: "live" },
  research: { pt: "pesquisa", en: "research" },
  confidentialTag: { pt: "confidencial", en: "confidential" },
  degree: { pt: "Bacharelado em Engenharia de Software", en: "B.Sc. in Software Engineering" },
  degreeYears: "2022 - 2027",
  degreeNote: { pt: "Conclusão prevista para 2027", en: "Expected to finish in 2027" },
  courseworkTitle: { pt: "Principais disciplinas", en: "Main subjects" },
  paperTitle: {
    pt: "Sistema de Interface Acessível para Comunicação e Automação Residencial a Pessoas com Esclerose Lateral Amiotrófica",
    en: "Accessible Interface System for Communication and Home Automation for People with Amyotrophic Lateral Sclerosis",
  },
  paperText: {
    pt: "Na iniciação científica, ajudei a criar uma interface para pessoas com ELA se comunicarem e controlarem a casa usando só o olhar. Ela funciona com a câmera do computador, conversa com a Alexa e manda mensagens pelo Telegram.",
    en: "During my undergraduate research, I helped create an interface that lets people with ALS communicate and control their home using only their eyes. It works with a computer camera, talks to Alexa and sends messages through Telegram.",
  },
  paperAuthors: "Nathalia Costa, Vitor Gonzaga, Elisa Dester, Filipe Vilela, Rita de Almeida",
  readArticle: { pt: "Ler o artigo", en: "Read the paper" },
  credential: { pt: "Ver credencial", en: "View credential" },
  spokenLanguages: { pt: "Idiomas", en: "Languages" },
  languages: { pt: "Português nativo, inglês B2", en: "Native Portuguese, English B2" },
  trophyHint: { pt: "Os projetos de que mais me orgulho. Ainda tem espaço na prateleira.", en: "The projects I'm proudest of. There's still room on the shelf." },
  extrasHint: { pt: "Outras coisas que construí pelo caminho.", en: "Other things I've built along the way." },
  seeExtras: { pt: "Ver outros projetos", en: "See other projects" },
  secretClose: { pt: "Fechar segredo", en: "Close secret" },
  lookHint: { pt: "Arraste para olhar em volta", en: "Drag to look around" },
  menu: { pt: "Abrir menu", en: "Open menu" },
  tour: { pt: "Fazer o tour", en: "Take the tour" },
  tourInvite: { pt: "Oi! Quer que eu te mostre o escritório?", en: "Hi! Want me to show you around the office?" },
  tourStart: { pt: "Começar o tour", en: "Start the tour" },
  tourSkip: { pt: "Explorar sozinho", en: "Explore on my own" },
  tourNext: { pt: "Pular", en: "Skip" },
  tourContinue: { pt: "Quando terminar, feche ou clique de novo para continuar.", en: "When you are done, close this or click it again to continue." },
  tourStop: { pt: "Parar o tour", en: "Stop the tour" },
  tourEnd: { pt: "É isso! Agora fique à vontade para explorar o escritório.", en: "That's it! Now feel free to explore the office." },
  tourEndButton: { pt: "Explorar", en: "Explore" },
  scoreHoop: { pt: "Cesta!", en: "Bucket!" },
  scoreGoal: { pt: "Gol!", en: "Goal!" },
  turnOnPc: { pt: "Ligar ou desligar o PC", en: "Turn the PC on or off" },
  spinChair: { pt: "Girar a cadeira", en: "Spin the chair" },
  themeToDay: { pt: "Abrir a cortina", en: "Open the curtain" },
  themeToNight: { pt: "Fechar a cortina", en: "Close the curtain" },
  portuguese: { pt: "Português", en: "Portuguese" },
  english: { pt: "Inglês", en: "English" },
};
