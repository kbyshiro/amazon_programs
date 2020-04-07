var http = require('http');
const mathjs = require('mathjs');

var server = http.createServer(function(req, res) {
    // GETのパラメータを取得し、パース
    var url_parse = new URL(req.url,'http://localhost:8080/');
    var query = url_parse.search.replace('?','');
    
    try{
        var result = mathjs.evaluate(query.toString());
        res.end(result.toString());
    }
    catch(error){
        console.log(error)
        console.log(typeof query)
        res.end('ERROR');
    }
  }).listen(8080);
