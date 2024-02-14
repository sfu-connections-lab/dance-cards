const userService = require('../services/userService');
const callService = require('../services/callService');
const loggingService = require('../services/loggingService');
const peerService = require('../services/peerService');

var emojisToPeerIds = {};

module.exports = function(io) {
    io.on('connection', async (socket) => {
        console.log('User connected');

        try {
            let users = await userService.getUsers();
            let currentCalls = await callService.getCalls();
            io.emit('users', { users: users, calls: currentCalls });
            io.emit('newCall', currentCalls);
            await peerService.checkTimeslots();

            socket.on('clientDisconnecting', async (emoji) => {
                console.log('User disconnected: ' + emoji);
            });

            socket.on('hideFan', async (emoji) => {
                await userService.toggleUserAvailability(emoji);
                let updatedUsers = await userService.getUsers();
                let currentCalls = await callService.getCalls();
                io.emit('users', { users: updatedUsers, calls: currentCalls });
                await loggingService.insertRow([new Date().toISOString(), emoji, 'hide/open fan']);
            });

            socket.on('userSignedIn', async (emoji) => {
                await userService.updateUserSignedInStatus(emoji, true);
                let updatedUsers = await userService.getUsers();
                io.emit('onlineUsers', updatedUsers);
                await loggingService.insertRow([new Date().toISOString(), emoji, 'sign in']);
            });

            socket.on('callUser', async (data) => {
                await callService.addCall(data.callerId, data.idToCall, data.timeslot);
                currentCalls = await callService.getCalls();
                io.emit('newCall', currentCalls);
                await loggingService.insertRow([new Date().toISOString(), data.callerId, 'call', data.idToCall]);
            });

            socket.on('peerId', (data) => {
                emojisToPeerIds[data.emoji] = data.peerId;
                console.log(emojisToPeerIds);
            });

        } catch (err) {
            console.error('Error in connection handler:', err);
        }
    });
};
