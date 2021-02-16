import {
	WebSocketPort, WebSocketEndpoint,
	HistoryEndpoint, SyncedStateEndpoint
} from './info.ts';
import { Message } from './common.ts';
import * as Actions from './actions.ts';
import { EmptySyncedState, performOne, SyncedState } from "./logic.ts";

const host = `localhost:${WebSocketPort}`;

const $history = document.getElementById('$history') as HTMLElement;
const $messageForm = document.getElementById('$messageForm') as HTMLElement;
const $name = document.getElementById('$name') as HTMLInputElement;
const $message = document.getElementById('$message') as HTMLInputElement;

let syncedState: SyncedState = EmptySyncedState;

function addMessage(m: Message) {
	const el = document.createElement('div');
	el.innerHTML = `<b>${m.name}</b>: ${m.message}`;
	$history.appendChild(el);
}

function broadcast(action: Actions.Action) {
	socket.send(JSON.stringify(action));
}

function renderState() {
	$history.textContent = '';
	for (const s of syncedState.messages) {
		addMessage({
			name: 'Unknown',
			message: s,
		});
	}
}

let socket = new WebSocket(`ws://${host}/${WebSocketEndpoint}`);
socket.onopen = e => {
	console.info('Connected!');
};
socket.onerror = e => {
	console.log('Error connecting:');
	console.warn(e);
};
socket.onmessage = e => {
	const action = JSON.parse(e.data) as Actions.Action;
	console.log(`Received via WebSocket: "${action}"`);

	if (performOne(syncedState, action));
		renderState();
};

$messageForm.onsubmit = (e: Event) => {
	e.preventDefault();
	
	const mes: Message = {
		name: $name.value,
		message: $message.value
	};
	console.log('Submitting:', mes);

	broadcast(Actions.addMessage($message.value));
	
	//socket.send(JSON.stringify(mes));
	$message.value = '';
};

async function loadInitialState() {
	const res = await fetch(`http://${host}/${SyncedStateEndpoint}`);
	syncedState = await res.json() as SyncedState;
	renderState();
};
loadInitialState();

export {};
