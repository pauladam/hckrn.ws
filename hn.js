// TODO Redefine the 'get-links/by-time' view
// 
// {
//    "by-time": {
//        "map": "function(doc) {\u000a  emit(doc.added, doc);\u000a}"
//    }
// }

// requires
var fs       = require('fs'), 
    sys      = require('sys'), 
    net      = require('net'), 
    url      = require('url'), 
    repl     = require('repl'), 
    http     = require('http'),
    utils    = require('./lib/utils'), 
    mustache = require('mustache.js/lib/mustache'),
    couchdb  = require('node-couchdb/lib/couchdb'),
    hashlib  = require("/home/paul/hashlib/build/default/hashlib"),
    cradle  = require('./lib/cradle/lib/cradle');

var cradleConnection = new(cradle.Connection), 
    cradleDb = cradleConnection.database('hnlinks'),
    RSS_REFRESH_INTERVAL = 1000 * 10,
    couchLinks = []; 

var client = couchdb.createClient(5984, 'localhost'),
    db = client.db('hnlinks');

var indexTempl ='';
fs.readFile('templates/index.html','utf8',function(err, fileData){ indexTempl = fileData; });

// needed for db init
cradleDb.insert('vador', { name: 'darth', force: 'dark' }, function (err, res) { });

// var linksIndex = utils.getLinks(cradleDb);
linksIndex = utils.getLinks(cradleDb);

sys.puts(JSON.stringify(linksIndex));

setInterval(function(){
  sys.puts('refreshing feed info');

  var HNJsonPipeUrl  = 'pipes.yahoo.com',
      HNJsonPipePath = '/pipes/pipe.run?_id=d0055a6b6e73c5256e4818f02e659a81&_render=json',
      connection     = http.createClient(80, HNJsonPipeUrl),
      reqHeaders     = { "host": HNJsonPipeUrl, "User-Agent": "NodeJS HTTP Client", },
      req            = connection.request('GET', HNJsonPipePath, reqHeaders);

  req.addListener('response', function (res) {

    var jsonData = '';
    res.setEncoding('utf8');
    res.addListener('data', function (chunk) { 
      jsonData += chunk; 
    });
    res.addListener('end', function(){

      var value = eval('(' + jsonData +')');
      
      try{
        var links = value['value']['items'];
      
        var newDocs = [];
        for(var i=0;i<links.length;i++){

          var curLink      = links[i],
              itemLink     = curLink['link'],
              itemTitle    = curLink['title'],
              itemComments = curLink['comments'],
              itemHash     = hashlib.md5(itemTitle);
              itemDomain   = url.parse(itemLink).protocol + 
                             '//' + url.parse(itemLink).host; 

          var newDoc = {  _id      : itemHash,
                          link     : itemLink, 
                          hash     : itemHash,
                          title    : itemTitle,
                          domain   : itemDomain,
                          added    : Date.now(),
                          comments : itemComments }

          newDocs.push(newDoc);

        }

        cradleDb.insert(newDocs, function(err, res){ 
          sys.puts(err); 
          sys.puts(res); 

          // update cache
          linksIndex = utils.getLinks(cradleDb);

        });

      }catch(TypeError){
        // This is the response to some other request, ignore
      }
    });
  });
  req.end();

}, RSS_REFRESH_INTERVAL);

sys.puts(JSON.stringify( utils.getLinks(cradleDb) ));

http.createServer(function (request, response) {

  // TODO Fix link indexes on page

  var href = url.parse(request.url).href;
  var page = parseInt(href.replace('/',''));
  page = page || 1;

  if( href.match(/\/\d/) || href.match(/\//) ){

    try{

      response.writeHead(200, {'Content-Type': 'text/html'});
      response.end(mustache.to_html(indexTempl, 
                                   { items: linksIndex[page], 
                                     nextPage : page < 10 && ( page + 1 ) || '/' } ));

    }catch(e){

      sys.puts(e);
      response.writeHead(500, {'Content-Type': 'text/html'});
      response.end("server exception");

    }

  }


}).listen(8000);

sys.puts('Server running at http://127.0.0.1:8000/');
repl.start('simple tcp server> ');
