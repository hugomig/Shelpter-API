const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server, {
    cors: {
      origin: '*',
    }
});

app.use(express.json());

app.get('/sendTest', (req,res) => {
    io.emit('test');
    res.send('envoye');
})

let i = 1;

io.on('connection', (socket) => {
    console.log('new connection');
    console.log(socket.id);
    console.log('username : '+i);
    socket.username = i;
    i++;

    socket.emit('welcome','Hello');

    socket.on('disconnect', () => {
        console.log('disconnected '+socket.id);
    });

    socket.on('teste', ()=>{
        console.log('teste');
    });

    socket.on('watchPosition',(longitude, latitude)=>{
        console.log('watch - '+socket.id+' : '+socket.username+' - '+longitude+' '+latitude)
        io.emit('getPosition',socket.username,longitude,latitude);
    });
});

server.listen(3000, () => {
    console.log('listening');
});