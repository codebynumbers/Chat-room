var app = require('http').createServer(handler)
   , io = require('socket.io').listen(app)
   , fs = require('fs')


var colors = ['blue', 'fuchsia', 'green', 'lime', 'maroon', 'navy', 'olive', 'purple', 'red', 'teal'];
var senderlist = {};
var ban_list = {}
var admin_list = {};
var password = process.env.AUTH_PW


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

function sysmesg(socket, message, extra) {
    var data  =  {
        msg:message,
        sender:"SYSTEM",
        color:'black',
        senderlist:senderlist
    }
    // merge in extra data
    for (var attrname in extra) { data[attrname] = extra[attrname]; }
    socket.emit('fullupdate', data );
}

io.sockets.on('connection', function (socket) {

    ip = socket.handshake.address;

    socket.on('speak', function (data) {
        console.log(data)
        if (!data.sender) {
            sysmesg(socket, 'Sender name required')
            return
        }
        if (ban_list[ip.address]){
            sysmesg(socket, "You\'ve been banned")
            return
        }

        // admin commands,
        // parse admin commands in seperate method
        if (data.msg.match(/^\/gamestart/)) {
            if (admin_list[socket.id]) {
                game_enabled = true;
                io.sockets.emit('gamestart', {});
                io.sockets.emit('gamenews', {
                    selected:selections
                });
            } else {
                sysmesg(socket, 'Not authorized, /auth first')
            }
        } else if (data.msg.match(/^\/gamestop/)) {
            if (admin_list[socket.id]) {
                game_enabled = false;
                io.sockets.emit('gamestop', {});
                selections = {};
            } else {
                sysmesg(socket, 'Not authorized, /auth first')
            }
        } else if (data.msg.match(/^\/choose/)) {
            if (admin_list[socket.id]) {
                parts = data.msg.split(' ')
                if (parts[1] && parts[2].match(/\d+/)) {
                    selections[parts[2]] = parts[1]
                    io.sockets.emit('gamenews', {
                        selected:selections
                    });
                }
            } else {
                sysmesg(socket, 'Not authorized, /auth first')
            }
        } else if (data.msg.match(/^\/ban/)) {
            if (admin_list[socket.id]) {
                parts = data.msg.split(' ')
                if (parts[1].match(/\d+\.\d+\.\d+\.\d+/)) {
                    ban_list[parts[1]] = true;
                    check_ban_list(socket);
                    sysmesg(socket, 'Banning '+parts[1])
                }
            } else {
                sysmesg(socket, 'Not authorized, /auth first')
            }
        } else if (data.msg.match(/^\/auth/)) {
            if (data.msg == '/auth '+password) {
                // set client as authorized
                admin_list[socket.id] = true;
                sysmesg(socket, 'Authorization successful', {show_ip:true})
            } else {
                sysmesg(socket, 'Authorization failed')
            }
        } else {
            // Regular chat - not a command
            io.sockets.emit('news', {
                msg:data.msg,
                sender:senderlist[socket.id]
            });
        }
    });

    socket.on('choose', function (data) {
        if (!selections[data.value]) {
            selections[data.value] = data.sender
            io.sockets.emit('gamenews', {
                selected:selections
            });
        } else {
            sysmesg(socket, 'Invalid choice');
        }
    });

    socket.on('namechange', function (data) {
        for (sender in senderlist) {
            if (senderlist[sender]['nick'].toLowerCase() == data.sender.toLowerCase()) {
                sysmesg(socket, 'That name already exists, choose another');
            }
        }
        if (data.old_sender == '') {
            msg = data.sender+' has joined the chat'
            if ( game_enabled ) {
                // push board data on join if game on
                io.sockets.emit('gamestart', {});
                io.sockets.emit('gamenews', {
                    selected:selections
                });
            }
        } else {
            msg = data.old_sender+' now known as '+data.sender
        }

        color = colors[Math.floor(Math.random() * colors.length)]
        senderlist[socket.id] = {
            'nick':data.sender,
            'color':color,
            'ip':ip
        }
        sysmesg(io.sockets, msg);
    });

    socket.on('disconnect', function () {
        try {
            msg = senderlist[socket.id]['nick']+' has left the building'
            delete senderlist[socket.id];
            sysmesg(io.sockets, msg);
        } catch (e) { console.log(e) }
    });

    function check_ban_list(socket) {
        for (sender in senderlist) {
            if (ban_list[senderlist[sender]['ip']['address']]) {
                msg = senderlist[sender]['nick']+' has been banned'
                delete senderlist[sender];
                sysmesg(io.sockets, msg);
            }
        }
    }
});
