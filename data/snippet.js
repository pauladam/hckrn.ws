// attach periodic event to event loop
// refresh feed info
setInterval(function(){

  // removed some decls for readability

  req.addListener('response', function (res) {

	// stream in feed data
    var jsonData = '';
    res.setEncoding('utf8');
    res.addListener('data', function (chunk) { 
      jsonData += chunk; 
    });

	// when finished process feed
    res.addListener('end', function(){

      var value = eval('(' + jsonData +')');
      
      try{
	    // process feed data
        cradleDb.insert(newDocs, function(err, res){ 
          // update caches after completion of insert
          linksIndex = utils.getLinks(cradleDb);
        });

      }catch(TypeError){ 
		/*  This is the response to some other request, ignore */  
      }
    });
  });

  req.end();

}, RSS_REFRESH_INTERVAL);