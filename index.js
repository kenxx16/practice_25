const fs = require('fs')
const path = require('path')
const http = require('http')
const url = require('url')
const ws = require('ws')

fs.readFile('site/index.html',
    function(err, data){
        if(err){
            throw err
        }
        htmlFile = data
    }
)

let server = http.createServer(function(req, res){
    switch (req.url){
        case "/":
            res.writeHead(200, {"Content-Type": "text/html"})
            res.write(htmlFile)
            res.end()
            break;
        default:
            fs.readFile('site/' + req.url, (err, fileContent)=>{
                let contentType = 'text/html'
                if (req.url.endsWhith('.css')) contentType = 'text/css'
                if (req.url.endsWhith('.js')) contentType = 'text/javascript'
            })
    }
})

server.listen(3000, function () {
    console.log("SERVER START");
})