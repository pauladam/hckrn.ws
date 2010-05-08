// requires
var fs       = require('fs'), 
    sys      = require('sys'), 
    net      = require('net'), 
    url      = require('url'), 
    repl     = require('repl'), 
    http     = require('http'),
    mustache = require('./lib/mustache'),
    couchdb  = require('node-couchdb/lib/couchdb'),
    hashlib  = require("/home/paul/hashlib/build/default/hashlib"),
    cradle  = require('./lib/cradle/lib/cradle');

var cradleConnection = new(cradle.Connection), 
    cradleDb = cradleConnection.database('hnlinks'),
    RSS_REFRESH_INTERVAL = 1000 * 60,
    couchLinks = []; 

var client = couchdb.createClient(5984, 'localhost'),
    db = client.db('hnlinks');

var indexTempl ='';
fs.readFile('templates/index.html','utf8',function(err, fileData){ indexTempl = fileData; });

// Test save design doc
db.saveDesign('nice', {
  views: {
    one: {
      map: function() {
        emit(doc.added, null)
      }
    }
  }
}, function(er, r) {
  // if (er) throw new Error(JSON.stringify(er));
});

cradleDb.insert('vador', { name: 'darth', force: 'dark' }, function (err, res) { });

// This structure allows us to redefine the view on
// each server start
// cradleDb.get('_design/get-links', function(err, doc){ 
//   var viewRev = doc._rev || "1-123";
//   cradleDb.remove('_design/get-links', viewRev, function(err, res){ 
// 
//     cradleDb.insert('_design/get-links', {
//         all: {
//             map: function (doc) {
//               if(doc.title != null){
//                 emit(doc.added, doc);
//               }
//             }
//         },
//         darkside: {
//             map: function (doc) {
//                 if (doc.name && doc.force == 'dark') {
//                     emit(null, doc);
//                 }
//             }
//         }
//     }, function(err, res){ // Result of view insertion
//       // err, res
//     });
//   });
// });


setInterval(function(){
  sys.puts('.');

  var HNJsonPipeUrl = 'pipes.yahoo.com',
      HNJsonPipePath = '/pipes/pipe.run?_id=d0055a6b6e73c5256e4818f02e659a81&_render=json',
      connection = http.createClient(80, HNJsonPipeUrl),
      reqHeaders = { "host": HNJsonPipeUrl, 
                      "User-Agent": "NodeJS HTTP Client", },
      req = connection.request('GET', HNJsonPipePath, reqHeaders);

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

        cradleDb.insert(newDocs, function(err, res){ sys.puts(err); sys.puts(res); });

      }catch(TypeError){
        // This is the response to some other request, ignore
      }
    });
  });
  req.end();

}, RSS_REFRESH_INTERVAL);

// setInterval(function(){ 
// 
//   db.view('designs', 'get-links', {limit: 10 }, function(er, r){ 
//     r.rows.forEach(function(e){ couchLinks.push(e.value); });
// 
//     sys.puts(JSON.stringify(couchLinks));
//   });
// 
//   
// }, 2000);

// another set interval here to refresh
// json obj w/ data from couch
//    db.view('designs', 'get-links', {limit:1}, function(er, r){ 
//      sys.puts('foo');
//
//    });
//
// then just refer to data statically below for serving

// needed
cradleDb.view('get-links/by-time', function (err, res) { });

// support 10 pages
linksIndex = { };
// var linksIndex = { };

var NUM_PAGES = 10;
var ITEMS_PER_PAGE = 20;

// pre-fetch the page links
for(var i=0;i<= NUM_PAGES;i++){

  cradleDb.view('get-links/by-time', 
                {limit: ITEMS_PER_PAGE, descending: true, skip: (i) * ITEMS_PER_PAGE }, 
                function (cerr, res) {

    var page = Math.floor(res.offset / ITEMS_PER_PAGE) + 1;
    var curPageDocs = [];
    res.forEach(function(i, doc){ curPageDocs.push(doc); sys.puts(doc.added); });
    linksIndex[page] = curPageDocs;

  });

}

http.createServer(function (request, response) {

  // Fix link indexes on page

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
