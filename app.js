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

function lookup(sender){
	found = -1
	for (i=0; i<senderlist.length; i++){
		if(senderlist[i]['nick'] == sender){
			found = i
			break;
		}
	}
	return found
}

io.sockets.on('connection', function (socket) {

  socket.on('speak', function (data) {
	// require a sender
	if (data.sender != '') {
	    pos = lookup(data.sender)
    	io.sockets.emit('news', {msg:data.msg, sender:data.sender, color:senderlist[pos]['color']} );
	}
  });

  socket.on('namechange', function (data) {
    //console.log(data);
	if (data.old_sender == '') {
		msg = data.sender+' has joined the chat' 
	} else {
		msg = data.old_sender+' now known as '+data.sender
	}

    pos = lookup(data.old_sender)
	// add new sender to list
    if (pos == -1){
		color = colors[Math.floor(Math.random() * colors.length)]
		senderlist.push({'nick':data.sender, 'color':color})
		pos = senderlist.length-1
	}
	// change name
	senderlist[pos]['nick'] = data.sender
    io.sockets.emit('namechange', {msg:msg, sender:"SYSTEM", color:'black', senderlist:senderlist} );
  });
});
