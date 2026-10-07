// Serves the game and keeps the save in save.json next to this file,
// so progress survives across browsers, devices and sessions.
//   node server.js            -> http://localhost:8377
//   PORT=9000 HOST=0.0.0.0 node server.js
const http=require('http'),fs=require('fs'),path=require('path');
const PORT=+process.env.PORT||8377,HOST=process.env.HOST||'127.0.0.1';
const SAVE=path.join(__dirname,'save.json');
// the only files the game is made of
const FILES={'/':'index.html','/index.html':'index.html','/js/data.js':'js/data.js','/js/core.js':'js/core.js','/js/game.js':'js/game.js','/js/ui.js':'js/ui.js'};

http.createServer((req,res)=>{
  const url=req.url.split('?')[0];
  if(url==='/save'&&req.method==='GET'){
    fs.readFile(SAVE,(err,data)=>{
      res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});
      res.end(err?'{}':data);
    });
  }else if(url==='/save'&&req.method==='PUT'){
    let body='';
    req.on('data',c=>{body+=c;if(body.length>65536)req.destroy()});
    req.on('end',()=>{
      try{JSON.parse(body)}catch(e){res.writeHead(400);return res.end()}
      // write to a temp file first so a crash mid-write can't corrupt the save
      fs.writeFile(SAVE+'.tmp',body,err=>{
        if(err){res.writeHead(500);return res.end()}
        fs.rename(SAVE+'.tmp',SAVE,err=>{res.writeHead(err?500:204);res.end()});
      });
    });
  }else if(FILES[url]&&req.method==='GET'){
    fs.readFile(path.join(__dirname,FILES[url]),(err,data)=>{
      if(err){res.writeHead(500);return res.end()}
      res.writeHead(200,{'Content-Type':(url.endsWith('.js')?'text/javascript':'text/html')+'; charset=utf-8','Cache-Control':'no-store'});
      res.end(data);
    });
  }else{res.writeHead(404);res.end()}
}).listen(PORT,HOST,()=>console.log(`BILLION running at http://${HOST}:${PORT}`));
