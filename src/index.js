const express = require("express");
const app = express();
const server = require("http").createServer(app);
const path = require("path");

const io = require("socket.io")(server);

const rooms = {};

io.on("connection", (socket) => {
	socket.on("newUser", (username, roomname) => {
		socket.join(roomname);
		rooms[roomname] = {
			...rooms[roomname],
			[socket.id]: username,
		};
		socket
			.to(roomname)
			.emit("userConnected", `${username} has been connect`);
	});
	socket.on("disconnect", () => {
		userRooms(socket).forEach((room) => {
			io.to(room).emit(
				"userDisconnected",
				`${rooms[room][socket.id]} has been disconnect`
			);
			delete rooms[room][socket.id];
		});
	});

	socket.on("sendMessage", (message) => {
		userRooms(socket).forEach((room) => {
			socket
				.to(room)
				.emit(
					"incomingMessage",
					`${rooms[room][socket.id]}: ${message}`
				);
		});
	});

	let timeout;

	socket.on("typing", () => {
		clearTimeout(timeout);

		userRooms(socket).forEach((room) => {
			socket
				.to(room)
				.emit("isTyping", `${rooms[room][socket.id]} is typing`);
		});

		timeout = setTimeout(() => {
			userRooms(socket).forEach((room) => {
				socket.to(room).emit("isTyping", "");
			});
		}, 2000);
	});

	function userRooms(socket) {
		return Object.entries(rooms).reduce((rooms, [roomname, users]) => {
			if (users[socket.id] != null) rooms.push(roomname);
			return rooms;
		}, []);
	}
});

app.use("/public", express.static(path.join(__dirname, "../public")));

app.get("/", (req, res) => res.redirect("/public/index.html"));

server.listen(3000, () => console.log("server on port 3000"));
