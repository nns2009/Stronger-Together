import { serve } from "https://deno.land/std@0.87.0/http/server.ts";
import {
	acceptWebSocket,
	isWebSocketCloseEvent,
	isWebSocketPingEvent,
	WebSocket,
} from "https://deno.land/std@0.87.0/ws/mod.ts";
import { v4 } from "https://deno.land/std@0.87.0/uuid/mod.ts";

import { WebSocketPort, WebSocketEndpoint, HistoryEndpoint } from './info.ts';
import { Message } from './common.ts';

const clients: Map<string, WebSocket> = new Map<string, WebSocket>();
const history: Message[] = [];

function broadcast(s: string) {
	console.log('clients map:', clients);

	for (const [uuid, sock] of clients) {
		// TODO: Use sock.isClosed ?
		try {
			sock.send(s);
		} catch (e) {
			console.error(`Caught send error to uuid: ${uuid}`);
			console.error(e);
			// Connection already invalid
			clients.delete(uuid);
		}
	}
}

async function handleWs(sock: WebSocket) {	
	const uuid = v4.generate();
	console.log("socket connected with uuid:", uuid);

	clients.set(uuid, sock);

	try {
		for await (const ev of sock) {
			if (typeof ev === "string") {
				console.log("ws:Text", ev);
				//await sock.send(ev);

				const mes: Message = JSON.parse(ev);
				history.push(mes);
				broadcast(JSON.stringify(mes));
			} else if (ev instanceof Uint8Array) {
				console.log("ws:Binary", ev);
			} else if (isWebSocketPingEvent(ev)) {
				const [, body] = ev;
				console.log("ws:Ping", body);
			} else if (isWebSocketCloseEvent(ev)) {
				const { code, reason } = ev;
				console.log("ws:Close", code, reason);
			}
		}
		console.log("socket finished with uuid:", uuid);
	} catch (err) {
		console.error(`failed to receive frame of uuid ${uuid}:`);
		console.error(`Error: ${err}`);

		if (!sock.isClosed) {
			await sock.close(1000).catch(console.error);
		}
	} finally {
		clients.delete(uuid);
	}
}

let pageLoads = 0;

if (import.meta.main) {
	const port = WebSocketPort;
	console.log(`websocket server is running on :${port}`);

	const allowOriginHeaders = new Headers();
	allowOriginHeaders.set("Access-Control-Allow-Origin", "*");

	for await (const req of serve(`:${port}`)) {
		const { conn, r: bufReader, w: bufWriter, headers, url } = req;
		console.log('--------------------------')
		console.log(`Connection received, url: "${url}"`);
		console.info(headers);

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
						console.error(`failed to accept websocket: ${err}`);
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
}
