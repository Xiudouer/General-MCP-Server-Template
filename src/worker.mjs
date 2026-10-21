import fs from 'node:fs/promises';
import path from 'node:path';
let input='';
for await(const part of process.stdin){input+=part;if(Buffer.byteLength(input)>65536)throw Error('input_limit');}
const job=JSON.parse(input);

async function search(){
  const matches=[];let scanned=0,visited=0,bytes=0,truncated=false;
  const skipped=new Set(['.git','.ssh','.aws','.codex','node_modules','private-state','.env','dist','build']);
  const ext=new Set(['.txt','.md','.js','.mjs','.cjs','.ts','.tsx','.jsx','.py','.go','.rs','.java','.sql','.html','.css','.csv']);
  async function walk(dir,depth=0){
    if(depth>10){truncated=true;return;}
    const handle=await fs.opendir(dir);
    for await(const entry of handle){
      if(++visited>3000||scanned>=200||matches.length>=50||bytes>=8*1024*1024){truncated=true;return;}
      if(entry.isSymbolicLink()||skipped.has(entry.name)||entry.name.startsWith('.'))continue;
      const file=path.join(dir,entry.name);
      if(entry.isDirectory()){await walk(file,depth+1);continue;}
      if(!entry.isFile()||!ext.has(path.extname(entry.name).toLowerCase()))continue;
      // Recheck containment immediately before open; workspace must not be changed by hostile writers.
      const real=await fs.realpath(file);const rel=path.relative(job.root,real);
      if(rel==='..'||rel.startsWith('..'+path.sep)||path.isAbsolute(rel))continue;
      const stat=await fs.stat(real);if(stat.size>1024*1024)continue;
      const data=await fs.readFile(real);bytes+=data.length;scanned++;
      if(data.includes(0))continue;
      const lines=data.toString('utf8').split(/\r?\n/);
      for(let i=0;i<lines.length;i++)if(lines[i].includes(job.query)){
        matches.push({file:rel.split(path.sep).join('/'),line:i+1,text:lines[i].slice(0,500)});
        if(matches.length>=50){truncated=true;break;}
      }
    }
  }
  await walk(job.directory);return {matches,scanned,truncated};
}

async function query(){
  const {DatabaseSync}=await import('node:sqlite');
  const db=new DatabaseSync(job.file,{readOnly:true,enableExtensionLoading:false});
  try{
    db.exec('PRAGMA query_only=ON; PRAGMA trusted_schema=OFF;');
    if(!/^\s*(SELECT|WITH)\b/i.test(job.sql))throw Error('select_only');
    const statement=db.prepare(job.sql);statement.setReadBigInts(true);
    const rows=[];let bytes=0,truncated=false;
    for(const row of statement.iterate(...job.params)){
      const clean=JSON.parse(JSON.stringify(row,(_,v)=>typeof v==='bigint'?v.toString():v));
      const size=Buffer.byteLength(JSON.stringify(clean));
      if(rows.length>=100||bytes+size>48000){truncated=true;break;}
      rows.push(clean);bytes+=size;
    }
    return {rows,truncated};
  } finally {db.close();}
}

try{process.stdout.write(JSON.stringify({result:await(job.kind==='search'?search():query())}));}
catch{process.stdout.write(JSON.stringify({error:'local_operation_failed'}));}
