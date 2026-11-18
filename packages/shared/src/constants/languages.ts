export interface LanguageDefinition {
  name: string;
  slug: string;
  extension: string;
  monacoLang?: string;
}

export const SUPPORTED_LANGUAGES: Record<string, LanguageDefinition> = {
  cpp: { name: 'C++', slug: 'cpp', extension: 'cpp', monacoLang: 'cpp' },
  java: { name: 'Java', slug: 'java', extension: 'java', monacoLang: 'java' },
  python: { name: 'Python', slug: 'python', extension: 'py', monacoLang: 'python' },
  python3: { name: 'Python 3', slug: 'python3', extension: 'py', monacoLang: 'python' },
  javascript: { name: 'JavaScript', slug: 'javascript', extension: 'js', monacoLang: 'javascript' },
  typescript: { name: 'TypeScript', slug: 'typescript', extension: 'ts', monacoLang: 'typescript' },
  c: { name: 'C', slug: 'c', extension: 'c', monacoLang: 'c' },
  csharp: { name: 'C#', slug: 'csharp', extension: 'cs', monacoLang: 'csharp' },
  golang: { name: 'Go', slug: 'golang', extension: 'go', monacoLang: 'go' },
  go: { name: 'Go', slug: 'go', extension: 'go', monacoLang: 'go' },
  kotlin: { name: 'Kotlin', slug: 'kotlin', extension: 'kt', monacoLang: 'kotlin' },
  rust: { name: 'Rust', slug: 'rust', extension: 'rs', monacoLang: 'rust' },
  mysql: { name: 'MySQL', slug: 'mysql', extension: 'sql', monacoLang: 'sql' },
  mssql: { name: 'MS SQL Server', slug: 'mssql', extension: 'sql', monacoLang: 'sql' },
  oraclesql: { name: 'Oracle SQL', slug: 'oraclesql', extension: 'sql', monacoLang: 'sql' },
  pythondata: { name: 'Pandas', slug: 'pythondata', extension: 'py', monacoLang: 'python' },
  postgresql: { name: 'PostgreSQL', slug: 'postgresql', extension: 'sql', monacoLang: 'sql' },
  swift: { name: 'Swift', slug: 'swift', extension: 'swift', monacoLang: 'swift' },
  ruby: { name: 'Ruby', slug: 'ruby', extension: 'rb', monacoLang: 'ruby' },
  scala: { name: 'Scala', slug: 'scala', extension: 'scala', monacoLang: 'scala' },
  php: { name: 'PHP', slug: 'php', extension: 'php', monacoLang: 'php' },
};

export function getLanguageDefinition(langSlug: string): LanguageDefinition {
  const normalized = langSlug.trim().toLowerCase();
  if (SUPPORTED_LANGUAGES[normalized]) {
    return SUPPORTED_LANGUAGES[normalized];
  }
  return {
    name: langSlug,
    slug: normalized,
    extension: normalized,
  };
}

