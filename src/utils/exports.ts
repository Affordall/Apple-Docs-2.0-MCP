/**
 * Whole lists the tools leave as files, for an agent with a shell to grep: one folder in the system's temporary
 * directory. Several servers may run at once (one per session), so every file and folder is written under a temporary
 * name and renamed into place: a reader sees all of it or none.
 */
import { existsSync } from 'node:fs';
import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const EXPORT_DIR = path.join(tmpdir(), 'apple-docs-mcp');

/** Where the export named `name` is written */
export const exportPath = (name: string): string => path.join(EXPORT_DIR, name);

type Cell = string | boolean | string[];

/**
 * `records` as tab-separated lines under a header of `columns`, each line the record's cells in the columns' order: a
 * list joined by commas, a cell's own tabs and line breaks turned into spaces
 */
export function tsv<C extends string>(columns: readonly C[], records: Array<Record<C, Cell>>): string {
  const text = (cell: Cell): string => (Array.isArray(cell) ? cell.join(', ') : String(cell)).replace(/[\t\r\n]+/g, ' ');
  return [columns.join('\t'), ...records.map((record) => columns.map((column) => text(record[column])).join('\t'))]
    .join('\n') + '\n';
}

/** `records` under `columns` as a TSV export named `name` */
export async function writeTsv<C extends string>(name: string, columns: readonly C[],
  records: Array<Record<C, Cell>>): Promise<string> {
  const file = exportPath(name);
  const partial = `${file}.${process.pid}.tmp`;
  await mkdir(EXPORT_DIR, { recursive: true });
  await writeFile(partial, tsv(columns, records));
  await rename(partial, file);
  return file;
}

/** A folder of text files, written the first time it's asked for; `files` maps each file's path inside it to its text */
export async function writeFolderOnce(name: string, files: () => Promise<Array<[string, string]>>): Promise<string> {
  const folder = exportPath(name);
  if (existsSync(folder)) {
    return folder;
  }
  const partial = `${folder}.${process.pid}.tmp`;
  for (const [relative, text] of await files()) {
    await mkdir(path.dirname(path.join(partial, relative)), { recursive: true });
    await writeFile(path.join(partial, relative), text);
  }
  try {
    await rename(partial, folder);
  } catch (error) {
    // Another server finished the same folder first
    if (!(error instanceof Error && 'code' in error && (error.code === 'ENOTEMPTY' || error.code === 'EEXIST'))) {
      throw error;
    }
    await rm(partial, { recursive: true, force: true });
  }
  return folder;
}
