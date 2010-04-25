// requires
var fs       = require('fs'), 
    sys      = require('sys'), 
    net      = require('net'), 
    repl     = require('repl'), 
    http     = require('http'),
    mustache = require('./lib/mustache'),
    couchdb  = require('node-couchdb/lib/couchdb'),
    hashlib  = require("/home/paul/hashlib/build/default/hashlib");

var INTERVAL = 3000,
    couch_client = couchdb.createClient(5984, 'localhost'),
    db = couch_client.db('hnlinks');

// Make / Save our query view
var get_links_view = function(doc){ emit(doc.title, doc); }
db.saveDesign('designs', { views: { "get-links": { map: get_links_view } } });

setInterval(function(){
  sys.puts('.');

  var hn_json_pipe_url = 'pipes.yahoo.com',
      hn_json_pipe_path = '/pipes/pipe.run?_id=d0055a6b6e73c5256e4818f02e659a81&_render=json',
      connection = http.createClient(80, hn_json_pipe_url),
      req_headers = { "host": hn_json_pipe_url, 
                      "User-Agent": "NodeJS HTTP Client", },
      req = connection.request('GET', hn_json_pipe_path, req_headers);

  req.addListener('response', function (res) {

    var json_data = '';
    res.setEncoding('utf8');
    res.addListener('data', function (chunk) { 
      json_data += chunk; 
    });
    res.addListener('end', function(){

      var value = eval('(' + json_data +')');
      
      try{
        var links = value['value']['items'];
      
        var new_docs = [];
        for(var i=0;i<links.length;i++){

          var cur_link      = links[i],
              item_link     = cur_link['link'],
              item_title    = cur_link['title'],
              item_comments = cur_link['comments'],
              item_hash     = hashlib.md5(item_title);

          var new_doc = { _id      : item_hash,
                          link     : item_link, 
                          title    : item_title,
                          comments : item_comments,
                          hash     : item_hash,
                          added    : Date.now() };

          new_docs.push(new_doc);

        }

        db.bulkDocs({ docs: new_docs}, function(err, result){ });

      }catch(TypeError){
        // This is the response to some other request, ignore
      }
    });
  });
  req.end();

}, INTERVAL);

http.createServer(function (request, response) {

  // db query for some links here...
  // db.view('designs',
  response.writeHead(200, {'Content-Type': 'text/html'});

  var view = {
    title: "Joe",
    truthy: true,
    falsy: false,
    calc: function() {
      return 2 + 4;
    }
  }

  fs.readFile('templates/index.html','utf8',function(err, data){ 

    response.end(mustache.to_html(data, view));

  });


}).listen(8000);

sys.puts('Server running at http://127.0.0.1:8000/');

repl.start('simple tcp server> ');
