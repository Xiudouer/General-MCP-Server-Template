#!/usr/bin/env node
import http from 'node:http';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash,timingSafeEqual } from 'node:crypto';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { loadConfig } from './config.mjs';
import { catalog,createServer } from './server.mjs';

export async function serveHTTP(config,tools,{port=18788,token=process.env.MCP_TOKEN}={}){
  if(!token||token.length<32)throw Error('MCP_TOKEN_requires_32_characters');
  const hash=v=>createHash('sha256').update(v).digest();
  const expected=hash('Bearer '+token);const gate={active:0};
  let requests=0,used=0,windowStart=Date.now();
  const listener=http.createServer({maxHeaderSize:8192},async(req,res)=>{
    const reply=(status,error)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store',...(status===401?{'WWW-Authenticate':'Bearer realm="local-mcp-kit"'}:{})});res.end(JSON.stringify({error}));};
    const portNow=listener.address().port;
    const allowedHosts=[`127.0.0.1:${portNow}`,`localhost:${portNow}`];
    if(!allowedHosts.includes(req.headers.host))return reply(403,'invalid_host');
    if(req.headers.origin&&!allowedHosts.map(h=>'http://'+h).includes(req.headers.origin))return reply(403,'invalid_origin');
    if(req.url!=='/mcp/local')return reply(404,'not_found');
    if(!timingSafeEqual(hash(req.headers.authorization??''),expected))return reply(401,'unauthorized');
    if(req.method!=='POST'){res.setHeader('Allow','POST');return reply(405,'method_not_allowed');}
    if(Date.now()-windowStart>=60000){windowStart=Date.now();used=0;}
    if(++used>120)return reply(429,'rate_limit');
    if(requests>=16)return reply(503,'server_busy');
    requests++;let server;
    try{
      if((req.headers['content-type']??'').split(';')[0]!=='application/json')return reply(415,'json_required');
      let size=0;const parts=[];
      for await(const part of req){size+=part.length;if(size>65536)return reply(413,'body_too_large');parts.push(part);}
      let body;try{body=JSON.parse(Buffer.concat(parts).toString('utf8'));}catch{return reply(400,'invalid_json');}
      server=createServer(config,tools,gate);
      const transport=new StreamableHTTPServerTransport({sessionIdGenerator:undefined,enableJsonResponse:true});
      res.once('close',()=>{void transport.close();void server.close();});
      await server.connect(transport);
      await transport.handleRequest(req,res,body);
    }catch{if(!res.headersSent)reply(500,'request_failed');else res.end();}
    finally{requests--;}
  });
  listener.requestTimeout=10000;listener.headersTimeout=5000;listener.timeout=15000;listener.maxConnections=32;
  await new Promise((resolve,reject)=>{listener.once('error',reject);listener.listen(port,'127.0.0.1',resolve);});
  return listener;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  await main();
}
async function main(){
  try{
    const [mode,configFile]=process.argv.slice(2);
    if(!['stdio','http'].includes(mode)||!configFile)throw Error('usage: node src/main.mjs stdio|http config.json');
    const config=await loadConfig(configFile);const tools=await catalog(config);
    if(mode==='stdio')await createServer(config,tools).connect(new StdioServerTransport());
    else{const listener=await serveHTTP(config,tools,{port:Number(process.env.MCP_PORT??18788)});console.error(`LocalMCPKit listening on http://127.0.0.1:${listener.address().port}/mcp/local`);}
  }catch(error){console.error(error instanceof Error?error.message:'startup_failed');process.exitCode=1;}
}
