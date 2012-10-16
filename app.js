var app = require('http').createServer(handler)
  , io = require('socket.io').listen(app)
  , fs = require('fs')


var colors = ['red','green','blue','orange','purple'];

var senderlist = {};
var ban_list = {}
var admin_list = {};

// for game
var selections = {};
var game_enabled = false;


app.listen(process.env.PORT || 5000);

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

  ip = socket.handshake.address;

  socket.on('speak', function (data) {
    // admin commands, 
    // parse admin commands in seperate method
    if (data.msg.match(/^\/gamestart/)) {
      if (admin_list[socket.id]) {
        selections = {};
        game_enabled = true;
    	io.sockets.emit('gamestart', {});        
      	io.sockets.emit('gamenews', {selected:selections});
      } else {
        socket.emit('fullupdate', {msg:'Not authorized, /auth first', sender:"SYSTEM", color:'black', senderlist:senderlist, show_ip:admin_list[socket.id]} );
      }
    } else if (data.msg.match(/^\/gamestop/)) {
        if (admin_list[socket.id]) {
            game_enabled = false;
            io.sockets.emit('gamestop', {});
        } else {
            socket.emit('fullupdate', {msg:'Not authorized, /auth first', sender:"SYSTEM", color:'black', senderlist:senderlist, show_ip:admin_list[socket.id]} );
        }
    } else if (data.msg.match(/^\/choose/)) {
        if (admin_list[socket.id] && game_enabled) {
            parts = data.msg.split(' ')
            if (parts[1] && parts[2].match(/\d+/)) {
                selections[parts[2]] = parts[1]
        	    io.sockets.emit('gamenews', {selected:selections});
            }
        } else {
            socket.emit('fullupdate', {msg:'Not authorized, /auth first', sender:"SYSTEM", color:'black', senderlist:senderlist, show_ip:admin_list[socket.id]} );
        }
    } else if (data.msg.match(/^\/ban/)) {
        if (admin_list[socket.id]) {
            parts = data.msg.split(' ')
            if (parts[1].match(/\d+\.\d+\.\d+\.\d+/)) {
                //console.log("banning "+parts[1]);
                ban_list[parts[1]] = true;
                check_ban_list(socket);
                socket.emit('fullupdate', {msg:'Banning '+parts[1], sender:"SYSTEM", color:'black', senderlist:senderlist, show_ip:admin_list[socket.id]} );
            }
        } else {
            socket.emit('fullupdate', {msg:'Not authorized, /auth first', sender:"SYSTEM", color:'black', senderlist:senderlist, show_ip:admin_list[socket.id]} );
        }
    } else if (data.msg.match(/^\/auth/)) {
      if (data.msg == '/auth '+process.env.AUTH_PW) {
        //console.log('auth ok');
        // set client as authorized
        admin_list[socket.id] = true;
        socket.emit('fullupdate', {msg:'Authorization successful', sender:"SYSTEM", color:'black', senderlist:senderlist, show_ip:admin_list[socket.id]} );
        //console.log(admin_list)
      } else {
        socket.emit('fullupdate', {msg:'Authorization failed', sender:"SYSTEM", color:'black', senderlist:senderlist, show_ip:admin_list[socket.id]} );
      }
    // Regular chat - not a command
    } else {
	    // require a sender
        //console.log('ban_list '+ban_list)
        //console.log('ip '+ip.address)
	    if (data.sender != '' && !ban_list[ip.address]) {
    	    io.sockets.emit('news', {msg:data.msg, sender:senderlist[socket.id]});
	    }
    }
  });

  socket.on('choose', function (data) {
	// require a sender
	if (data.sender != '') {
      if (!selections[data.value]) {  
        selections[data.value] = data.sender
        //console.log(selections)
    	io.sockets.emit('gamenews', {selected:selections});
      } else { 
        socket.emit('fullupdate', {msg:'Invalid choice', sender:"SYSTEM", color:'black', senderlist:senderlist, show_ip:admin_list[socket.id]} );
      }
	}
  });

  socket.on('namechange', function (data) {
    //console.log(data);
    for (sender in senderlist) {    
        if (senderlist[sender]['nick'].toLowerCase() == data.sender.toLowerCase()) {
            socket.emit('fullupdate', {msg:"That name already exists, choose another", sender:"SYSTEM", color:'black', senderlist:senderlist, show_ip:admin_list[socket.id]} );
            return;
        }
    }
	if (data.old_sender == '') {
		msg = data.sender+' has joined the chat' 
        if ( game_enabled ) {
            // push board data on join if game on
        	io.sockets.emit('gamestart', {});        
        	io.sockets.emit('gamenews', {selected:selections});
        }
	} else {
		msg = data.old_sender+' now known as '+data.sender
	}

    color = colors[Math.floor(Math.random() * colors.length)]
	senderlist[socket.id] = {'nick':data.sender, 'color':color, 'ip':ip}
    io.sockets.emit('fullupdate', {msg:msg, sender:"SYSTEM", color:'black', senderlist:senderlist, show_ip:admin_list[socket.id]} );
  });

  socket.on('disconnect', function () {
    try {
      elvis = senderlist[socket.id]['nick']
      delete senderlist[socket.id];    
      io.sockets.emit('fullupdate', {msg:elvis+' has left the building', sender:"SYSTEM", color:'black', senderlist:senderlist, show_ip:admin_list[socket.id]} );
    } catch (e) { }
  });

  function check_ban_list(socket) {
    //console.log('check_ban_list '+ban_list)
    for (sender in senderlist) {
      //console.log(senderlist[sender])
      if (ban_list[senderlist[sender]['ip']['address']]) {
         user = senderlist[sender]['nick']
         //console.log('banning ip: '+senderlist[sender]['ip']['address']+' user: '+user);
         delete senderlist[sender];  
         io.sockets.emit('fullupdate', {msg:user+' has been banned', sender:"SYSTEM", color:'black', senderlist:senderlist, show_ip:admin_list[socket.id]} );
      } 
    }
  }

});
