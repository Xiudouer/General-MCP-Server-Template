import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { loadConfig,inside } from '../src/config.mjs';
import { catalog } from '../src/server.mjs';
import { serveHTTP } from '../src/main.mjs';
import { isolatedJob } from '../src/tools.mjs';

const base=fileURLToPath(new URL('..',import.meta.url));
const testBase=process.env.LOCAL_MCP_TEST_DIR??os.tmpdir();
await fs.mkdir(testBase,{recursive:true});
const root=await fs.mkdtemp(path.join(testBase,'local-mcp-kit-test-'));
const workspace=path.join(root,'repo');await fs.mkdir(workspace);
await fs.writeFile(path.join(workspace,'hello.md'),'MCP hello\nlocal tools\n');
const git=process.env.GIT_EXECUTABLE??(process.platform==='win32'?'C:/Program Files/Git/cmd/git.exe':'git');
function runGit(...args){return execFileSync(git,['-C',workspace,...args],{windowsHide:true,stdio:'pipe'});}
runGit('init');runGit('add','hello.md');runGit('-c','user.name=Example','-c','user.email=example@invalid','commit','-m','Example fixture');
await fs.appendFile(path.join(workspace,'hello.md'),'changed\n');
const dbfile=path.join(root,'sample.sqlite');const db=new DatabaseSync(dbfile);
db.exec("CREATE TABLE notes(id INTEGER PRIMARY KEY,title TEXT); INSERT INTO notes VALUES(1,'MCP sample'),(2,'other');");db.close();
const configFile=path.join(root,'config.json');
await fs.writeFile(configFile,JSON.stringify({workspace,gitExecutable:git,enabledTools:['git_status','git_log','text_search','sqlite_query'],database:{file:dbfile,queries:{find:'SELECT id,title FROM notes WHERE title LIKE ?',write:'WITH x AS (SELECT 1) DELETE FROM notes'}},plugins:[]}));
const config=await loadConfig(configFile);const tools=await catalog(config);
const data=result=>JSON.parse(result.content[0].text);

test('real stdio initialize/list/git/search/sqlite and validation',async()=>{
  const client=new Client({name:'fixture-client',version:'1.0.0'});
  const transport=new StdioClientTransport({command:process.execPath,args:[path.join(base,'src/main.mjs'),'stdio',configFile],stderr:'pipe'});
  let stderr='';transport.stderr?.on('data',chunk=>stderr+=chunk);
  try{
    await client.connect(transport);
    assert.equal(client.getServerVersion().name,'local-mcp-kit');
    assert.equal((await client.listTools()).tools.length,4);
    assert.match(data(await client.callTool({name:'git_status',arguments:{}})).output,/hello.md/);
    assert.match(data(await client.callTool({name:'git_log',arguments:{limit:1}})).output,/Example fixture/);
    const search=data(await client.callTool({name:'text_search',arguments:{query:'MCP'}}));
    assert.equal(search.matches[0].file,'hello.md');
    const rows=data(await client.callTool({name:'sqlite_query',arguments:{name:'find',params:['%MCP%']}})).rows;
    assert.equal(rows.length,1);assert.equal(rows[0].title,'MCP sample');
    const attack=data(await client.callTool({name:'sqlite_query',arguments:{name:'find',params:["%' OR 1=1 --"]}}));
    assert.equal(attack.rows.length,0);
    assert.equal((await client.callTool({name:'sqlite_query',arguments:{name:'write'}})).isError,true);
    assert.equal(data(await client.callTool({name:'sqlite_query',arguments:{name:'find',params:['%']}})).rows.length,2);
    assert.equal((await client.callTool({name:'text_search',arguments:{query:'MCP',directory:'../'}})).isError,true);
    assert.equal((await client.callTool({name:'git_log',arguments:{limit:1000}})).isError,true);
    assert.equal((await client.callTool({name:'text_search',arguments:{query:'MCP',extra:'invalid'}})).isError,true);
    assert.ok(!stderr.includes('MCP sample'));
  }finally{await client.close();}
});

test('HTTP SDK handshake/tools/call, auth, Host, Origin, malformed JSON, methods and size',async()=>{
  const token='test-only-'+ 'x'.repeat(40);
  const server=await serveHTTP(config,tools,{port:0,token});
  const url=`http://127.0.0.1:${server.address().port}/mcp/local`;
  const auth={Authorization:'Bearer '+token};
  const client=new Client({name:'http-fixture',version:'1.0.0'});
  try{
    assert.equal((await fetch(url,{method:'POST'})).status,401);
    assert.equal((await fetch(url+'?token='+token,{method:'POST'})).status,404);
    assert.equal((await fetch(url,{method:'POST',headers:{...auth,Origin:'https://evil.invalid'}})).status,403);
    const hostStatus=await new Promise((resolve,reject)=>{
      const req=http.request(url,{method:'POST',headers:{...auth,Host:'evil.invalid'}},res=>{res.resume();resolve(res.statusCode);});req.on('error',reject);req.end();
    });
    assert.equal(hostStatus,403);
    assert.equal((await fetch(url,{method:'GET',headers:auth})).status,405);
    assert.equal((await fetch(url,{method:'POST',headers:{...auth,'Content-Type':'application/json'},body:'{'})).status,400);
    assert.equal((await fetch(url,{method:'POST',headers:{...auth,'Content-Type':'application/json'},body:'x'.repeat(70000)})).status,413);
    await client.connect(new StreamableHTTPClientTransport(new URL(url),{requestInit:{headers:auth}}));
    assert.equal((await client.listTools()).tools.length,4);
    assert.equal(data(await client.callTool({name:'text_search',arguments:{query:'local'}})).matches.length,1);
  }finally{await client.close();await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});}
});

test('allowlist hides and prevents direct calls; trusted plugin extension works',async()=>{
  const custom={...config,enabledTools:['local_echo'],plugins:[path.join(base,'examples/echo-plugin.mjs')]};
  const registry=await catalog(custom);
  const server=await serveHTTP(custom,registry,{port:0,token:'y'.repeat(40)});
  const client=new Client({name:'plugin-fixture',version:'1.0.0'});
  try{
    await client.connect(new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${server.address().port}/mcp/local`),{requestInit:{headers:{Authorization:'Bearer '+'y'.repeat(40)}}}));
    assert.deepEqual((await client.listTools()).tools.map(x=>x.name),['local_echo']);
    assert.equal(data(await client.callTool({name:'local_echo',arguments:{text:'adapter'}})).text,'adapter');
    assert.equal((await client.callTool({name:'git_status',arguments:{}})).isError,true);
  }finally{await client.close();await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});}
});

test('scope escape and unknown configured tools fail closed',async()=>{
  await assert.rejects(inside(workspace,'..'));
  await assert.rejects(catalog({...config,enabledTools:['not_a_tool']}));
  await assert.rejects(serveHTTP(config,tools,{port:0,token:'short'}));
});

test('database result budget and OS child deadline are enforced',async()=>{
  const limited=await isolatedJob({kind:'sqlite',file:dbfile,sql:'WITH RECURSIVE x(n) AS (VALUES(1) UNION ALL SELECT n+1 FROM x WHERE n<200) SELECT n FROM x',params:[]});
  assert.equal(limited.rows.length,100);assert.equal(limited.truncated,true);
  await assert.rejects(isolatedJob({kind:'sqlite',file:dbfile,sql:'WITH RECURSIVE x(n) AS (VALUES(1) UNION ALL SELECT n+1 FROM x) SELECT sum(n) FROM x',params:[]}),/time_limit/);
});
