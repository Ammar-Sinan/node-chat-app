const http = require('http')
const express = require('express')
const path = require('path')
const socketio = require('socket.io')
const Filter = require('bad-words')
const { generateMessage, generateLocationMessage } = require('./utils/messages')
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users')

const app = express()
const server = http.createServer(app)
const io = socketio(server)

const port = process.env.PORT || 3000
const publicDirectoryPath = path.join(__dirname, '../public')

app.use(express.static(publicDirectoryPath))


// arg(socket) an object contains an information about the new connection - .on method fires whenever a request comes to server 
io.on('connection', (socket) => {
    console.log('New websocket connection')

    socket.on('join', (loginInfo, callback) => {
        const { error, user } = addUser({ id: socket.id, ...loginInfo })
        if (error) {
            return callback(error)
        }

        socket.join(user.room)

        socket.emit('message', generateMessage('Welcome!', 'Admin'))
        // .broadcast sets an event for every conneection except the socket owner 
        socket.broadcast.to(user.room).emit('message', generateMessage(`${user.username} has joined!`, 'Admin'))
        io.to(user.room).emit('roomdata', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })
        callback()

    })

    socket.on('sendMessage', (message, callback) => {
        const user = getUser(socket.id)
        const filter = new Filter()

        if (filter.isProfane(message)) {
            return callback('Profanity is not allowed!')
        }
        io.to(user.room).emit('message', generateMessage(message, user.username))
        // calling cb() to acknowledge the event - you get access to arguments passed to cb() on the client
        callback()
    })

    socket.on('disconnect', () => {
        const user = removeUser(socket.id)

        if (user) {
            io.to(user.room).emit('message', generateMessage(`${user.username} has left`, 'Admin'))
            io.to(user.room).emit('roomdata', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }

    })

    socket.on('sendLocation', (coords, callback) => {
        const user = getUser(socket.id)
        io.to(user.room).emit('locationMessage', generateLocationMessage(`https://google.com/maps?q=${coords.latitude},${coords.longitude}`, user.username))
        callback()
    })

})



server.listen(port, () => {
    console.log(`server is up on port ${port}`)
})




// for refrence 
// let count = 0
// // arg(socket) an object contains an information about the new connection
// // 'connection' fires whenever a request comes to server
// io.on('connection', (socket) => {
//     console.log('New websocket connection')
//     // .emit sets an event, takes event name. count will be ava in cb fun on the client
//     socket.emit('countUpdated', count)


//     // listen to event coming from client
//     socket.on('increment', () => {
//         count++
//         // when using socket.emit - it emits an event to a single connection
//         //socket.emit('countUpdated', count)

//         // io.emit- emit the event to every connection available
//         io.emit('countUpdated', count)
//     })

// })