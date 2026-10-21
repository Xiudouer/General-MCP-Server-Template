import fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';

const schema = z.object({
  workspace: z.string().min(1),
  gitExecutable: z.string().optional(),
  enabledTools: z.array(z.string()).min(1),
  database: z.object({file:z.string(), queries:z.record(z.string(),z.string())}).optional(),
  plugins:z.array(z.string()).default([]),
}).strict();

export async function loadConfig(file) {
  const configPath=path.resolve(file);
  const config=schema.parse(JSON.parse(await fs.readFile(configPath,'utf8')));
  const base=path.dirname(configPath);
  config.workspace=await fs.realpath(path.resolve(base,config.workspace));
  if (!(await fs.stat(config.workspace)).isDirectory()) throw Error('workspace_not_directory');
  if (config.gitExecutable && !path.isAbsolute(config.gitExecutable)) throw Error('gitExecutable_must_be_absolute');
  if(config.database) config.database.file=await fs.realpath(path.resolve(base,config.database.file));
  config.plugins=await Promise.all(config.plugins.map(p=>fs.realpath(path.resolve(base,p))));
  return config;
}

export async function inside(root, relative='.') {
  if(path.isAbsolute(relative)) throw Error('outside_workspace');
  const resolved=await fs.realpath(path.resolve(root,relative));
  const rel=path.relative(root,resolved);
  if(rel==='..'||rel.startsWith('..'+path.sep)||path.isAbsolute(rel)) throw Error('outside_workspace');
  return resolved;
}
