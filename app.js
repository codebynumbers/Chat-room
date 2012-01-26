var app = require('http').createServer(handler)
  , io = require('socket.io').listen(app)
  , fs = require('fs')

var senderlist = []

app.listen(80);

colors = ['red','green','blue','orange','purple']

function handler (req, res) {
  fs.readFile(__dirname + '/index.html',
  function (err, data) {
    if (err) {
      res.writeHead(500);
      return res.end('Error loading index.html');
    }

    res.writeHead(200);
    res.end(data);
  });
}

io.sockets.on('connection', function (socket) {
  socket.on('my other event', function (data) {
    pos = senderlist.indexOf(data.sender)
    if (pos == -1){
		senderlist.push(data.sender)
    }
    pos = senderlist.indexOf(data.sender)
    io.sockets.emit('news', {msg:data.msg, sender:data.sender, color:colors[pos % colors.length]} );
  });

  socket.on('namechange', function (data) {
    console.log(data);
    pos = senderlist.indexOf(data.old_sender);
	senderlist[pos] = data.sender
    io.sockets.emit('namechange', {msg:data.old_sender+" now known as "+data.sender, sender:"System", color:'black', senderlist:senderlist, colors:colors} );
  });
});
