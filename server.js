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
    });

    //send a list of all users available to play the game to a client
    client.on('getOpponents', data =>{
        let response = []; // initialize as empty  

        for(let id in sockets){
            const isNotYouAndNotPlaying = id !== client.id && !sockets[id].is_playing;
            if(isNotYouAndNotPlaying){
                response.push({
                    id,
                    mobile_number : sockets[id].mobile_number,
                    played : players[sockets[id].mobile_number].played,
                    won: players[sockets[id].mobile_number].won,
                    draw: players[sockets[id].mobile_number].draw
                });
            }
        }

        // wait and retrieve opponents response after sending invitation to play
        client.emit('getOpponentsResponse', response);

        client.broadcast.emit('newOpponentAdded', {
            id: client.id,  
            mobile_number: sockets[client.id].mobile_number,  
            played: players[sockets[client.id].mobile_number].played,  
            won: players[sockets[client.id].mobile_number].won,  
            draw: players[sockets[client.id].mobile_number].draw
        });
    });

    //When Client select any opponent to play game then it will generate new game. New game starts here
    client.on('selectOpponent', data =>{
        let response = {
            status : false,
            message : 'Opponent is playing with someone else!!'
        }

        let isOpponentPlaying = !sockets[data.id].is_playing;

        if(isOpponentPlaying){
            //generate a random Id for the ongoing game
            let gameId = uuidv4();
            sockets[data.id].is_playing = true;
            sockets[client.id].is_playing = true;
            sockets[data.id].game_id = gameId;
            sockets[client.id].game_id = gameId;
            players[sockets[data.id].mobile_number].played = players[sockets[data.id].mobile_number].played + 1;  
            players[sockets[client.id].mobile_number].played = players[sockets[client.id].mobile_number].played + 1;

            //initialize empty(new) game
            games[gameId] = {
                player1 : client.id,
                player2 : data.id,
                whoseTurnToStart : client.id,
                playboard : [["", "", ""], ["", "", ""], ["", "", ""]], // set new game with empty grid
                game_status : "ongoing",  // can be (ongoing, won, draw)
                gameWinner : null, // no winner yet
                winning_combination : []
            }

            //player 1 details
            games[gameId][client.id] = {
                mobile_number : sockets[client.id].mobile_number,
                sign : "X",
                played: players[sockets[client.id].mobile_number].played,  
                won: players[sockets[client.id].mobile_number].won,  
                draw: players[sockets[client.id].mobile_number].draw
            };

            //player 2 details
            games[gameId][data.id] = {
                mobile_number : sockets[data.id].mobile_number,
                sign : "O",
                played: players[sockets[data.id].mobile_number].played,  
                won: players[sockets[data.id].mobile_number].won,  
                draw: players[sockets[data.id].mobile_number].draw 
            };

            // join the two players
            io.sockets.connected[client.id].join(gameId);
            io.sockets.connected[data.id].join(gameId);

            // exclude the 2 players from being selected for another new game from a different player
            io.emit('excludePlayers', [client.id, data.id]);

            // broadcast game details!!
            io.to(gameId).emit('gameStarted', {
                status : true,
                game_id : gameId,
                game_data : games[gameId]
            });
        }
    });

    let gameBetweenInSeconds = 15; // time between next game
    let gameBetweenInterval = null;
})


// Generate Game ID  
// Gotten from stack overflow
function uuidv4() {  
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {  
        const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);  
        return v.toString(16);  
    });  
} 