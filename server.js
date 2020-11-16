const server = require('http').createServer();
const io = require('socket.io');
const colors = require('colors')

//bind socket to server
io(server);

//port of server
const PORT = process.env.PORT || 8080;

//hosting server
const HOST = process.env.HOST || "127.0.0.1";

let players = {} //map for storing details about all the players

let sockets = {} //stores all the connected clients

let games = {} //stores and keeps track of ongoing games

const winningCombinations = [
    [[0,0], [0,1], [0,2]],  // cell 1  2  3
    [[1,0], [1,1], [1,2]],  // cell 4  5  6
    [[2,0], [2,1], [2,2]], //  cell 7  8  9
    [[0,0], [1,0], [2,0]], //  cell 1  4  7
    [[0,1], [1,1], [2,1]], //  cell 2  5  8
    [[0,2], [1,2], [2,2]], //  cell 3  6  9
    [[0,0], [1,1], [2,2]], //  cell 1  5  9
    [[0,2], [1,1], [2,0]], //  cell 3  5  7
]

// Connection event Emiiter
io.on('connection', client =>{
    console.log(`Client Connected!! ${client.id}`.green.bold);
    client.emit('connected', { id : client.id }); // notify client that it has connected with the server

    //handle user registeration process
    client.on('checkUserDetail', data =>{
        let registered = false;
        for(let id in sockets){
            if(socket[id].mobile_number === data.mobileNumber){
                registered = true; //user found
                break;
            }
        }

        // if user not found save user details
        if(!registered){
            sockets[id] = {
                mobile_number : data.mobileNumber,
                is_playing : false,
                game_id : null
            }
        

            let flag = false;
            for(let id in players){
                if(id === data.mobileNumber){
                    flag = true;
                    break;
                }
            }

            if(!flag){
                players[data.mobileNumber] = {
                    played : 0,
                    won : 0,
                    draw : 0
                }
            }
        }
        client.emit('checkUserDetailResponse', !registered);
    })
})