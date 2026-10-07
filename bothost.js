/*
 BotHost — versão para Koyeb/Render
 Requisitos: Node.js 20+
 Execute: node bothost.js
 A plataforma fornece PORT automaticamente.
*/


const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execFile, spawn } = require("child_process");

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "0.0.0.0";
const ROOT = path.join(__dirname, "bots");
const USER = process.env.ADMIN_USER || "admin";
const PASS = process.env.ADMIN_PASSWORD || "admin123";
const sessions = new Map();
const running = new Map();
const eventClients = new Map();

fs.mkdirSync(ROOT, { recursive: true });

const HTML = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>BotHost</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#080c12;color:#e7edf4;font-family:system-ui,Arial}
button,input,textarea{font:inherit}button{background:#2563eb;color:white;border:0;border-radius:7px;padding:9px 13px;cursor:pointer}
input,textarea{background:#0b1118;color:#e7edf4;border:1px solid #253140;border-radius:7px;padding:10px}
.hidden{display:none!important}.login{min-height:100vh;display:grid;place-items:center}
.card{background:#111923;border:1px solid #263342;border-radius:14px;padding:25px;width:min(390px,92vw)}
.card input,.card button{width:100%;margin-top:10px}
header{height:58px;border-bottom:1px solid #202b37;display:flex;align-items:center;justify-content:space-between;padding:0 18px}
main{display:grid;grid-template-columns:230px 1fr;height:calc(100vh - 58px)}
aside{border-right:1px solid #202b37;padding:12px;overflow:auto}.title{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
.bot{padding:10px;border-radius:7px;margin:4px 0;cursor:pointer}.bot:hover,.bot.active{background:#172331}
.bot small{display:block;color:#7e8b99;margin-top:3px}.workspace{padding:14px;overflow:auto}
.top{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
.actions{display:flex;gap:6px}.grid{display:grid;grid-template-columns:1.3fr 1fr;gap:10px}
.box{background:#101720;border:1px solid #202c38;border-radius:9px;overflow:hidden}.bar{padding:8px 11px;border-bottom:1px solid #202c38;display:flex;justify-content:space-between}
.files{display:flex;gap:5px;padding:6px;overflow:auto}.files button{background:#1a2530;padding:6px 9px;font-size:12px}
.files button.active{background:#2563eb}.editor textarea{display:block;width:100%;height:410px;border:0;border-radius:0;resize:none;font-family:monospace}
.logs pre{height:440px;margin:0;padding:10px;overflow:auto;font:12px monospace;white-space:pre-wrap}
.term{grid-column:1/2}.termout{height:150px;padding:10px;overflow:auto;white-space:pre-wrap;font:12px monospace}
.term form{display:flex;gap:7px;padding:7px;border-top:1px solid #202c38}.term form input{flex:1;border:0}
.install{grid-column:2/3}.row{display:flex;gap:7px;padding:10px}.row input{flex:1}
.muted{color:#82909d}.ok{color:#4ade80}
@media(max-width:850px){main{grid-template-columns:1fr}aside{max-height:180px;border-right:0;border-bottom:1px solid #202b37}.grid{grid-template-columns:1fr}.term,.install{grid-column:auto}}
</style>
</head>
<body>
<div id="login" class="login"><div class="card">
<h1>BotHost</h1><p class="muted">Hospedagem de bots · Koyeb / Render</p>
<input id="lu" placeholder="Usuário"><input id="lp" type="password" placeholder="Senha">
<button onclick="login()">Entrar</button><p id="lm"></p>
</div></div>

<div id="app" class="hidden">
<header><b>BotHost</b><button onclick="logout()">Sair</button></header>
<main>
<aside><div class="title"><b>Meus bots</b><button onclick="createBot()">+</button></div><div id="list"></div></aside>
<section class="workspace">
<div id="empty"><h2>Selecione um bot</h2><p class="muted">Crie um projeto Python ou Node.js.</p></div>
<div id="panel" class="hidden">
<div class="top"><div><h2 id="name"></h2><span id="st" class="muted"></span></div>
<div class="actions"><button onclick="start()">Iniciar</button><button onclick="stop()">Parar</button><button onclick="restart()">Reiniciar</button></div></div>
<div class="grid">
<div class="box editor"><div class="bar"><span>Editor</span><button onclick="save()">Salvar</button></div>
<div id="files" class="files"></div><textarea id="code" spellcheck="false"></textarea></div>
<div class="box logs"><div class="bar">Logs</div><pre id="logs"></pre></div>
<div class="box term"><div class="bar">Terminal</div><div id="termout" class="termout"></div>
<form onsubmit="terminal(event)"><span>$</span><input id="cmd" placeholder="npm install discord.js"></form></div>
<div class="box install"><div class="bar">Instalar módulo</div><div class="row">
<input id="pkg" placeholder="discord.js ou requests"><button onclick="install()">Instalar</button></div></div>
</div></div>
</section></main></div>

<script>
let bot=null,file=null,ws=null;
const $=x=>document.getElementById(x);
async function api(u,o={}){let r=await fetch(u,{headers:{'Content-Type':'application/json'},...o});let d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Erro');return d}
async function login(){try{await api('/api/login',{method:'POST',body:JSON.stringify({user:$('lu').value,password:$('lp').value})});location.reload()}catch(e){$('lm').textContent=e.message}}
async function logout(){await api('/api/logout',{method:'POST'});location.reload()}
async function load(){let m=await api('/api/me');if(!m.authenticated)return; $('login').classList.add('hidden');$('app').classList.remove('hidden');list()}
async function list(){let a=await api('/api/bots');$('list').innerHTML=a.map(x=>'<div class="bot '+(bot?.id===x.id?'active':'')+'" onclick="selectBot(\\''+x.id+'\\')"><b>'+esc(x.name)+'</b><small>'+x.type+' · '+x.status+'</small></div>').join('')}
async function createBot(){let n=prompt('Nome do bot:');if(!n)return;let t=confirm('OK = Python | Cancelar = Node.js')?'python':'node';let b=await api('/api/bots',{method:'POST',body:JSON.stringify({name:n,type:t})});await list();selectBot(b.id)}
async function selectBot(id){let a=await api('/api/bots');bot=a.find(x=>x.id===id);if(!bot)return;$('empty').classList.add('hidden');$('panel').classList.remove('hidden');$('name').textContent=bot.name;setStatus(bot.status);connect();files()}
function setStatus(s){$('st').textContent=s;$('st').className=s==='running'?'ok':''}
function connect(){if(ws)ws.close();ws=new EventSource('/api/bots/'+bot.id+'/events');ws.onmessage=e=>{let m=JSON.parse(e.data);if(m.type==='log'){$('logs').textContent+=m.data;$('logs').scrollTop=$('logs').scrollHeight}if(m.type==='status'){setStatus(m.status);list()}};ws.onerror=()=>{}}
async function files(){let a=await api('/api/bots/'+bot.id+'/files');$('files').innerHTML=a.map((x,i)=>'<button class="'+(!i?'active':'')+'" onclick="openFile(\\''+x+'\\',this)">'+esc(x)+'</button>').join('');if(a[0])openFile(a[0],$('files').firstElementChild)}
async function openFile(n,e){file=n;[...$('files').children].forEach(x=>x.classList.remove('active'));e.classList.add('active');let d=await api('/api/bots/'+bot.id+'/file?name='+encodeURIComponent(n));$('code').value=d.content}
async function save(){await api('/api/bots/'+bot.id+'/file',{method:'PUT',body:JSON.stringify({name:file,content:$('code').value})});$('termout').textContent+='Arquivo salvo.\\n'}
async function start(){await api('/api/bots/'+bot.id+'/start',{method:'POST'});list()}
async function stop(){await api('/api/bots/'+bot.id+'/stop',{method:'POST'});list()}
async function restart(){await api('/api/bots/'+bot.id+'/restart',{method:'POST'});list()}
async function install(){let p=$('pkg').value.trim();if(!p)return;await api('/api/bots/'+bot.id+'/install',{method:'POST',body:JSON.stringify({package:p})});$('termout').textContent+='Instalação iniciada: '+p+'\\n';$('pkg').value=''}
async function terminal(e){e.preventDefault();let c=$('cmd').value.trim();if(!c)return;$('termout').textContent+='$ '+c+'\\n';let d=await api('/api/bots/'+bot.id+'/terminal',{method:'POST',body:JSON.stringify({command:c})});$('termout').textContent+=d.output+'\\n[exit '+d.code+']\\n';$('cmd').value=''}
function esc(s){return s.replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[x]))}
load();
</script>
</body></html>`;

function json(res, code, data) {
  res.writeHead(code, {"Content-Type":"application/json; charset=utf-8"});
  res.end(JSON.stringify(data));
}
function body(req) {
  return new Promise((resolve,reject)=>{
    let s=""; req.on("data",d=>{s+=d}); req.on("end",()=>{try{resolve(s?JSON.parse(s):{})}catch(e){reject(e)}}); req.on("error",reject);
  });
}
function auth(req){return sessions.has(req.headers.cookie?.match(/session=([^;]+)/)?.[1]);}
function id(req){return req.url.split("/")[3]?.split("?")[0];}
function safe(s){return String(s||"").toLowerCase().replace(/[^a-z0-9_-]/g,"-").slice(0,35)}
function meta(i){try{return JSON.parse(fs.readFileSync(path.join(ROOT,i,"bot.json")))}catch{return null}}
function send(id,p){
  const list=eventClients.get(id)||new Set();
  const data="data: "+JSON.stringify(p)+"\n\n";
  for(const res of list){
    try{res.write(data)}catch{}
  }
}
function runBotProcess(i,type,args){
  const dir=path.join(ROOT,i);
  const command=type==="python"?"python":"node";
  const p=spawn(command,args,{cwd:dir,env:{...process.env,PYTHONUNBUFFERED:"1"},shell:false});
  running.set(i,p);
  p.stdout.on("data",d=>send(i,{type:"log",data:d.toString()}));
  p.stderr.on("data",d=>send(i,{type:"log",data:d.toString()}));
  p.on("error",e=>send(i,{type:"log",data:"[erro] "+e.message+"\\n"}));
  p.on("close",code=>{running.delete(i);send(i,{type:"status",status:"stopped",code})});
  send(i,{type:"status",status:"running"});
  return p;
}
function startBot(i){
  const m=meta(i); if(!m)return;
  if(running.has(i))return;
  const args=m.type==="python"?["main.py"]:["index.js"];
  runBotProcess(i,m.type,args);
}
function stopBot(i){
  const p=running.get(i);
  if(!p){send(i,{type:"status",status:"stopped"});return}
  p.kill("SIGTERM");
  setTimeout(()=>{if(running.has(i))p.kill("SIGKILL")},5000);
}
function runShell(i,command,timeout=30000){
  return new Promise(resolve=>{
    const p=spawn(command,{cwd:path.join(ROOT,i),env:process.env,shell:true});
    let out="";
    p.stdout.on("data",d=>out+=d);
    p.stderr.on("data",d=>out+=d);
    let done=false;
    const finish=(code)=>{if(done)return;done=true;clearTimeout(timer);resolve({output:out,code})};
    const timer=setTimeout(()=>{out+="\\n[tempo limite excedido]\\n";p.kill("SIGKILL");finish(124)},timeout);
    p.on("error",e=>{out+=e.message;finish(1)});
    p.on("close",code=>finish(code??1));
  });
}

const server=http.createServer(async(req,res)=>{
  try{
    if(req.method==="GET"&&req.url==="/health"){return json(res,200,{ok:true,service:"BotHost"})}
    if(req.method==="GET"&&req.url==="/"){res.writeHead(200,{"Content-Type":"text/html; charset=utf-8"});return res.end(HTML)}
    if(req.method==="POST"&&req.url==="/api/login"){let b=await body(req);if(b.user===USER&&b.password===PASS){let s=crypto.randomBytes(24).toString("hex");sessions.set(s,b.user);res.setHeader("Set-Cookie","session="+s+"; HttpOnly; SameSite=Lax");return json(res,200,{ok:true})}return json(res,401,{error:"Credenciais inválidas"})}
    if(req.method==="POST"&&req.url==="/api/logout"){let s=req.headers.cookie?.match(/session=([^;]+)/)?.[1];sessions.delete(s);return json(res,200,{ok:true})}
    if(req.method==="GET"&&req.url==="/api/me")return json(res,200,{authenticated:auth(req)});
    if(!auth(req))return json(res,401,{error:"Não autenticado"});

    const eventMatch=req.method==="GET" ? req.url.match(/^\/api\/bots\/([^/]+)\/events$/) : null;
    if(eventMatch){
      const bi=eventMatch[1];
      if(!meta(bi))return json(res,404,{error:"Bot não encontrado"});
      res.writeHead(200,{"Content-Type":"text/event-stream; charset=utf-8","Cache-Control":"no-cache","Connection":"keep-alive","X-Accel-Buffering":"no"});
      if(!eventClients.has(bi))eventClients.set(bi,new Set());
      eventClients.get(bi).add(res);
      res.write("retry: 3000\n\n");
      res.write("data: "+JSON.stringify({type:"status",status:running.has(bi)?"running":"stopped"})+"\n\n");
      req.on("close",()=>{eventClients.get(bi)?.delete(res);if(eventClients.get(bi)?.size===0)eventClients.delete(bi)});
      return;
    }

    if(req.method==="GET"&&req.url==="/api/bots"){
      const a=fs.readdirSync(ROOT,{withFileTypes:true}).filter(x=>x.isDirectory()).map(x=>{let m=meta(x.name);return m?{...m,status:running.has(x.name)?"running":"stopped"}:null}).filter(Boolean);return json(res,200,a)
    }

    if(req.method==="POST"&&req.url==="/api/bots"){
      let b=await body(req), name=safe(b.name), type=b.type==="python"?"python":"node";
      if(!name)return json(res,400,{error:"Nome inválido"});
      let i=name+"-"+crypto.randomBytes(3).toString("hex"),d=path.join(ROOT,i);fs.mkdirSync(d,{recursive:true});
      let m={id:i,name,type,createdAt:new Date().toISOString()};fs.writeFileSync(path.join(d,"bot.json"),JSON.stringify(m,null,2));
      if(type==="python"){fs.writeFileSync(path.join(d,"main.py"),'print("Bot Python iniciado!")\\n');fs.writeFileSync(path.join(d,"requirements.txt"),"")}
      else{fs.writeFileSync(path.join(d,"index.js"),'console.log("Bot Node.js iniciado!");\\n');fs.writeFileSync(path.join(d,"package.json"),JSON.stringify({name,version:"1.0.0",type:"module"},null,2))}
      return json(res,200,m)
    }

    let i=id(req),m=meta(i);if(!m)return json(res,404,{error:"Bot não encontrado"});

    if(req.method==="GET"&&req.url.startsWith("/api/bots/"+i+"/files")){
      return json(res,200,fs.readdirSync(path.join(ROOT,i),{withFileTypes:true}).filter(x=>x.isFile()&&x.name!=="bot.json").map(x=>x.name))
    }
    if(req.method==="GET"&&req.url.startsWith("/api/bots/"+i+"/file")){
      let n=new URL(req.url,"http://x").searchParams.get("name")||"";if(!/^[\\w.-]+$/.test(n))return json(res,400,{error:"Arquivo inválido"});
      let f=path.join(ROOT,i,n);if(!fs.existsSync(f))return json(res,404,{error:"Arquivo não encontrado"});return json(res,200,{name:n,content:fs.readFileSync(f,"utf8")})
    }
    if(req.method==="PUT"&&req.url==="/api/bots/"+i+"/file"){
      let b=await body(req);if(!/^[\\w.-]+$/.test(b.name))return json(res,400,{error:"Arquivo inválido"});fs.writeFileSync(path.join(ROOT,i,b.name),String(b.content||""));return json(res,200,{ok:true})
    }
    if(req.method==="POST"&&req.url==="/api/bots/"+i+"/start"){startBot(i);return json(res,200,{ok:true})}
    if(req.method==="POST"&&req.url==="/api/bots/"+i+"/stop"){stopBot(i);return json(res,200,{ok:true})}
    if(req.method==="POST"&&req.url==="/api/bots/"+i+"/restart"){stopBot(i);setTimeout(()=>startBot(i),500);return json(res,200,{ok:true})}
    if(req.method==="POST"&&req.url==="/api/bots/"+i+"/install"){
      let b=await body(req),p=String(b.package||"").trim();if(!/^[a-zA-Z0-9@._+:/=-]+$/.test(p))return json(res,400,{error:"Pacote inválido"});
      const command=m.type==="python"?"python -m pip install --disable-pip-version-check "+p+" && python -m pip freeze > requirements.txt":"npm install "+p+" --no-audit --no-fund";
      runShell(i,command,120000).then(r=>{send(i,{type:"log",data:r.output+"\\n"});});
      return json(res,200,{ok:true})
    }
    if(req.method==="POST"&&req.url==="/api/bots/"+i+"/terminal"){
      let b=await body(req),c=String(b.command||"").replace(/\\0/g,"");if(!c)return json(res,400,{error:"Comando vazio"});
      let x=docker(i,m.type,["sh","-lc",c]),out="";x.stdout.on("data",d=>out+=d);x.stderr.on("data",d=>out+=d);x.on("close",code=>json(res,200,{output:out,code}));return
    }
    json(res,404,{error:"Rota não encontrada"});
  }catch(e){json(res,500,{error:e.message})}
});

server.listen(PORT,HOST,()=>console.log("BotHost rodando em http://"+HOST+":"+PORT));
