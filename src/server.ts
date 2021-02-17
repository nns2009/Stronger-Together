import { serve } from "https://deno.land/std@0.87.0/http/server.ts";
import {
	acceptWebSocket,
	isWebSocketCloseEvent,
	isWebSocketPingEvent,
	WebSocket,
} from "https://deno.land/std@0.87.0/ws/mod.ts";
import { v4 } from "https://deno.land/std@0.87.0/uuid/mod.ts";
import { createHash } from "https://deno.land/std@0.87.0/hash/mod.ts";

import {
	WebSocketPort, WebSocketEndpoint,
	SyncedStateEndpoint
} from './info.ts';
import { assertNever } from './common.ts';
import { EmptySyncedState, SyncedState } from './logic.ts';

import * as Commands from './commands.ts';
import * as Actions from './actions.ts';
import { performOne } from './logic.ts';

const log = console.log;
const logError = console.error;
const logInfo = console.info;





// ----- ----- ----- Log in stuff ----- ----- -----

function hash(s: string): string {
	const h = createHash('sha3-256');
	h.update(s);
	return h.toString();
}

type PlayerInfo = {
	id: number,
	password: string,
	salt: string,
};

let playersInfo = new Map<string, PlayerInfo>();
let tokens = new Map<string, number>();
let syncedState: SyncedState = EmptySyncedState;

let nextPlayerId =
	playersInfo.size == 0
		? 1
		: 1 + Math.max(...[...playersInfo.values()].map(info => info.id));
/*
function clearServerState() {
	syncedState = {
		messages: []
	};
}
clearServerState();
*/


// ----- ----- ----- Network stuff ----- ----- -----

const clients: Map<string, WebSocket> = new Map<string, WebSocket>();

// TODO: think through error handling
function sendString(sock: WebSocket, s: string) {
	sock.send(s);
}
function sendCommand(sock: WebSocket, command: Commands.ClientCommand) {
	const commandString = JSON.stringify(command);
	sendString(sock, commandString);
}

function broadcastString(s: string) {
	log('clients map:', clients);

	for (const [uuid, sock] of clients) {
		// TODO: Use sock.isClosed ?
		try {
			sock.send(s);
		} catch (e) {
			logError(`Caught send error to uuid: ${uuid}`);
			logError(e);
			// Connection already invalid
			clients.delete(uuid);
		}
	}
}
function broadcastCommand(command: Commands.ClientCommand) {
	const commandString = JSON.stringify(command);
	broadcastString(commandString);
}
function broadcastAction(action: Actions.Action) {
	const command = Commands.clientPerform(action);
	broadcastCommand(command);
}

async function handleWs(sock: WebSocket) {	
	const uuid = v4.generate();
	log("socket connected with uuid:", uuid);

	clients.set(uuid, sock);

	let playerId: number | null = null;

	sendCommand(sock, Commands.setSyncedState(syncedState));

	try {
		for await (const ev of sock) {
			if (typeof ev === "string") {
				log("ws:Text", ev);
				//await sock.send(ev);

				const command = JSON.parse(ev) as Commands.ServerCommand;
				switch (command.type) {
					case Commands.ServerCommandType.Perform:
						const action = command.action;
						if (performOne(syncedState, action))
							broadcastAction(action);
						break;


					case Commands.ServerCommandType.SignWithCredentials: {
						let username = command.username.trim();
						let password = command.password;

						const info = playersInfo.get(username);

						if (!info)
							sendCommand(sock, Commands.failedSign("Player with this username doesn't exist"));
						else if (info.password != hash(info.salt + password))
							sendCommand(sock, Commands.failedSign('Wrong password!'));
						else {
							playerId = info.id;

							const newToken = v4.generate();
							tokens.set(newToken, playerId);

							sendCommand(sock, Commands.confirmSign(playerId, newToken));
						}
						break;
					}
					
					case Commands.ServerCommandType.SignWithToken: {
						const token = command.token;
						const id = tokens.get(token);

						if (id == undefined)
							sendCommand(sock, Commands.failedSign('Invalid token!'));
						else {
							playerId = id;
							sendCommand(sock, Commands.confirmSign(id, token));
						}
						break;
					}

					case Commands.ServerCommandType.Register: {
						let username = command.username.trim();
						let password = command.password;
						if (playersInfo.has(username))
							sendCommand(sock, Commands.failedSign('User with this username already exists'));
						else if (!(3 <= username.length && username.length <= 50))
							sendCommand(sock, Commands.failedSign('Username length should be between 3 and 50!'));
						else if (!(4 <= password.length && password.length <= 50))
							sendCommand(sock, Commands.failedSign('Password length should be between 4 and 50!'));
						else {
							const newId = nextPlayerId++;
							const salt = v4.generate();
							playersInfo.set(username, {
								id: newId,
								salt,
								password: hash(salt + password),
							});
							playerId = newId;

							const newToken = v4.generate();
							tokens.set(newToken, playerId);

							// TODO: perform player creation action?
							sendCommand(sock, Commands.confirmSign(playerId, newToken));
						}
						break;
					}

					default:
						assertNever(command);
				}
			}
			else if (isWebSocketPingEvent(ev)) {
				const [, body] = ev;
				log("ws:Ping", body);
			}
			else if (isWebSocketCloseEvent(ev)) {
				const { code, reason } = ev;
				log("ws:Close", code, reason);
			}
		}
		log("socket finished with uuid:", uuid);
	} catch (err) {
		logError(`failed to receive frame of uuid ${uuid}:`);
		logError(`Error: ${err}`);

		if (!sock.isClosed) {
			await sock.close(1000).catch(logError);
		}
	} finally {
		clients.delete(uuid);
	}
}

// ----- ----- ----- HTTP Server ----- ----- -----

let pageLoads = 0;

const port = WebSocketPort;
log(`websocket server is running on :${port}`);

const allowOriginHeaders = new Headers();
allowOriginHeaders.set("Access-Control-Allow-Origin", "*");
allowOriginHeaders.set('Content-Type', 'application/json');

const jsonHeaders = new Headers();
jsonHeaders.set('Content-Type', 'application/json');
 
for await (const req of serve(`:${port}`)) {
	const { conn, r: bufReader, w: bufWriter, headers, url } = req;
	log('--------------------------')
	log(`Connection received, url: "${url}"`);
	logInfo(headers);

	switch (url.trim().toLowerCase()) {
		case '/':
			let userAgent = req.headers.get('user-agent') || 'Unknown';
			req.respond({
				status: 200,
				body: `Page was loaded ${pageLoads++} times since reload\nAnd your user agent is: ${userAgent}`
			});
			break;
		case `/${SyncedStateEndpoint}`:
			req.respond({
				headers: allowOriginHeaders,
				body: JSON.stringify(syncedState),
			});
			break;

		// TODO: disable this on production server for security
		case '/players':
			req.respond({
				headers: jsonHeaders,
				body: JSON.stringify(Object.fromEntries(playersInfo)),
			});
			break;
		case '/tokens':
			req.respond({
				headers: jsonHeaders,
				body: JSON.stringify(Object.fromEntries(tokens)),
			})
			break;

		case '/favicon.ico':
			req.respond({
				body: 'No icon, sorry'
			});
			break;
		case `/${WebSocketEndpoint}`:
			acceptWebSocket({
				conn,
				bufReader,
				bufWriter,
				headers,
			})
				.then(handleWs)
				.catch(async (err) => {
					logError(`failed to accept websocket: ${err}`);
					await req.respond({ status: 400 });
				});
			break;
		default:
			req.respond({
				status: 404,
				body: `Page not found: ${req.url}`
			});
			break;
	}

}
