// HNM utils

var sys = require('sys');

exports.getLinks = function(dbcon){
  var links = {},
      NUM_PAGES = 10,
      ITEMS_PER_PAGE = 20;

  // pre-fetch the page links
  for(var i=0;i<= NUM_PAGES;i++){

    dbcon.view('get-links/by-time', 
               {limit: ITEMS_PER_PAGE, descending: true, skip: (i) * ITEMS_PER_PAGE }, 
                function (cerr, res) {

                  var page = Math.floor(res.offset / ITEMS_PER_PAGE) + 1,
                      curPageDocs = [];

                  res.forEach(function(i, doc){ 
                    if(doc.title){
                      curPageDocs.push(doc); 
                    }
                  });
                  links[page] = curPageDocs;

    });
  }
  return links;
};
