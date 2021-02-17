import { serve } from "https://deno.land/std@0.87.0/http/server.ts";
import {
	acceptWebSocket,
	isWebSocketCloseEvent,
	isWebSocketPingEvent,
	WebSocket,
} from "https://deno.land/std@0.87.0/ws/mod.ts";
import { v4 } from "https://deno.land/std@0.87.0/uuid/mod.ts";

import {
	WebSocketPort, WebSocketEndpoint,
	HistoryEndpoint, SyncedStateEndpoint
} from './info.ts';
import { assertNever, Message } from './common.ts';
import { EmptySyncedState, SyncedState } from './logic.ts';

import * as Commands from './commands.ts';
import * as Actions from './actions.ts';
import { performOne } from './logic.ts';
import { assert } from "https://deno.land/std@0.87.0/_util/assert.ts";

const log = console.log;
const logError = console.error;
const logInfo = console.info;


let syncedState: SyncedState = EmptySyncedState;
/*
function clearServerState() {
	syncedState = {
		messages: []
	};
}
clearServerState();
*/


const clients: Map<string, WebSocket> = new Map<string, WebSocket>();
const history: Message[] = [];

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

function broadcastAction(action: Actions.Action) {
	const command = Commands.clientPerform(action);
	const commandString = JSON.stringify(command);
	broadcastString(commandString);
}

async function handleWs(sock: WebSocket) {	
	const uuid = v4.generate();
	log("socket connected with uuid:", uuid);

	clients.set(uuid, sock);

	try {
		for await (const ev of sock) {
			if (typeof ev === "string") {
				log("ws:Text", ev);
				//await sock.send(ev);

				const command = JSON.parse(ev) as Commands.ServerCommand;
				switch (command.type) {
					case Commands.ServerCommandType.SignWithCredentials:
						break;
					
					case Commands.ServerCommandType.SignWithToken:
						break;

					case Commands.ServerCommandType.Register:
						break;

					case Commands.ServerCommandType.Perform:
						const action = command.action;
						if (performOne(syncedState, action))
							broadcastAction(action);
						break;

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

let pageLoads = 0;

const port = WebSocketPort;
log(`websocket server is running on :${port}`);

const allowOriginHeaders = new Headers();
allowOriginHeaders.set("Access-Control-Allow-Origin", "*");
 
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
		case `/${HistoryEndpoint}`:
			req.respond({
				headers: allowOriginHeaders,
				body: JSON.stringify(history),
			});
			break;
		case `/${SyncedStateEndpoint}`:
			req.respond({
				headers: allowOriginHeaders,
				body: JSON.stringify(syncedState),
			});
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
