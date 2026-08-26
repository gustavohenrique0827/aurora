import fs from "node:fs";
import path from "node:path";
import os from "node:os";

/**
 * Read-only, path-locked access to Gustavo's real project folders — so Aurora
 * can actually discuss what's in a project instead of only reasoning from what
 * he types. Deliberately narrow, same philosophy as appLauncher.ts: fixed,
 * predictable trigger phrases (never free-form AI-guessed paths), a hard root
 * boundary, and a name-pattern exclusion list so secrets never get read.
 *
 * n8n (Aurora's brain) runs on a remote server and can't reach this Mac's
 * filesystem — so unlike a normal agent "tool", this doesn't run mid-reasoning.
 * It runs HERE, locally, before the message is sent, and the file content (or
 * directory listing) is spliced into the chatInput as extra context. Aurora
 * then reasons over it like any other part of the message.
 */

const PROJECTS_ROOT = path.join(os.homedir(), "Documents", "Projetos");
const MAX_FILE_CHARS = 6000;
const MAX_DEPTH = 3;

const EXCLUDED_NAME_PATTERN =
  /^(\.env.*|\.git|node_modules|\.ssh|.*\.pem$|.*credentials.*|.*secret.*|.*\.key$|package-lock\.json|\.ds_store|.*\.icloud-bak$|.*[-.]bak$)$/i;

function isExcluded(name: string): boolean {
  return name.startsWith(".") || EXCLUDED_NAME_PATTERN.test(name);
}

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function listProjectRoots(): string[] {
  try {
    return fs
      .readdirSync(PROJECTS_ROOT, { withFileTypes: true })
      .filter((e) => e.isDirectory() && !isExcluded(e.name))
      .map((e) => e.name);
  } catch {
    return [];
  }
}

function resolveProjectDir(nameHint: string): string | null {
  const target = stripAccents(nameHint.toLowerCase()).replace(/\s+/g, "");
  for (const name of listProjectRoots()) {
    const normalized = stripAccents(name.toLowerCase()).replace(/\s+/g, "");
    if (normalized === target || normalized.includes(target) || target.includes(normalized)) {
      const full = path.join(PROJECTS_ROOT, name);
      // Hard boundary: resolved path must still live inside PROJECTS_ROOT.
      if (path.resolve(full).startsWith(path.resolve(PROJECTS_ROOT) + path.sep)) return full;
    }
  }
  return null;
}

function findFile(projectDir: string, fileHint: string): string | null {
  const target = stripAccents(fileHint.toLowerCase()).replace(/\s+/g, "");
  const stack: { dir: string; depth: number }[] = [{ dir: projectDir, depth: 0 }];
  while (stack.length) {
    const { dir, depth } = stack.pop()!;
    if (depth > MAX_DEPTH) continue;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (isExcluded(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push({ dir: full, depth: depth + 1 });
      } else {
        const normalized = stripAccents(entry.name.toLowerCase()).replace(/\s+/g, "");
        if (normalized === target || normalized === `${target}.md` || normalized.startsWith(target)) {
          return full;
        }
      }
    }
  }
  return null;
}

function listDir(dir: string): string {
  try {
    const entries = fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((e) => !isExcluded(e.name))
      .map((e) => `${e.isDirectory() ? "📁" : "📄"} ${e.name}`);
    return entries.length > 0 ? entries.join("\n") : "(pasta vazia)";
  } catch (err) {
    return `(erro ao ler a pasta: ${(err as Error).message})`;
  }
}

export interface ProjectContextResult {
  contextBlock: string;
}

/**
 * Fixed, predictable trigger phrases only — never free-form path guessing:
 *   "liste os projetos"
 *   "o que tem no projeto <nome>" / "liste o projeto <nome>" / "mostra o projeto <nome>"
 *   "leia o <arquivo> do projeto <nome>" / "resuma o <arquivo> do projeto <nome>"
 */
export function matchProjectContextRequest(rawText: string): ProjectContextResult | null {
  const text = stripAccents(rawText.toLowerCase()).trim().replace(/[!?.]+$/, "");

  if (/\bliste\s+os\s+projetos\b/.test(text)) {
    const roots = listProjectRoots();
    return {
      contextBlock:
        roots.length > 0
          ? `[Pastas em ${PROJECTS_ROOT}]:\n${roots.map((r) => `📁 ${r}`).join("\n")}`
          : `[Nenhuma pasta encontrada em ${PROJECTS_ROOT}]`,
    };
  }

  const listMatch = text.match(/(?:o que tem no|liste o|mostra o|mostre o)\s+projeto\s+([a-z0-9._-]+)/);
  if (listMatch) {
    const projectDir = resolveProjectDir(listMatch[1]);
    if (!projectDir) return { contextBlock: `[Não encontrei um projeto chamado "${listMatch[1]}" em ${PROJECTS_ROOT}]` };
    return { contextBlock: `[Conteúdo de ${path.basename(projectDir)}]:\n${listDir(projectDir)}` };
  }

  const readMatch = text.match(/(?:leia|le|mostra|mostre|resuma|resume)\s+(?:o\s+|a\s+)?([a-z0-9._-]+)\s+do\s+projeto\s+([a-z0-9._-]+)/);
  if (readMatch) {
    const [, fileHint, projectHint] = readMatch;
    const projectDir = resolveProjectDir(projectHint);
    if (!projectDir) return { contextBlock: `[Não encontrei um projeto chamado "${projectHint}" em ${PROJECTS_ROOT}]` };
    const filePath = findFile(projectDir, fileHint);
    if (!filePath) return { contextBlock: `[Não encontrei um arquivo chamado "${fileHint}" no projeto ${path.basename(projectDir)}]` };
    try {
      const content = fs.readFileSync(filePath, "utf8").slice(0, MAX_FILE_CHARS);
      return { contextBlock: `[Conteúdo de ${path.relative(PROJECTS_ROOT, filePath)}]:\n${content}` };
    } catch (err) {
      return { contextBlock: `[Erro ao ler ${path.relative(PROJECTS_ROOT, filePath)}: ${(err as Error).message}]` };
    }
  }

  return null;
}
