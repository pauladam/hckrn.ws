var sys = require('sys'), http = require('http'), repl = require('repl');

var url, path;

if(0){
  url = 'news.ycombinator.com';
  path = '/rss';
}else{
  url = 'skullsplitter.net';
  path = '/photos/rss.php';
}

var connection = http.createClient(80, url);
var req_headers = {"host": url, "User-Agent": "NodeJS HTTP Client"};
var request = connection.request('GET', path, req_headers);

repl.start('simple tcp server> ');

request.addListener('response', function (response) {
  //sys.puts('STATUS: ' + response.statusCode);
  //sys.puts('HEADERS: ' + JSON.stringify(response.headers));

  response.setEncoding('utf8');
  page = '';
  response.addListener('data', function (chunk) {
    // sys.puts('BODY: ' + chunk);
    page += chunk;
  });

  response.addListener('end', function(){
    // page is ready
    sys.puts(page);

  });

});
request.end();


