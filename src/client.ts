import {
	WebSocketPort, WebSocketEndpoint,
	HistoryEndpoint, SyncedStateEndpoint
} from './info.ts';
import { assertNever, Message } from './common.ts';
import * as Commands from './commands.ts';
import * as Actions from './actions.ts';
import { EmptySyncedState, performOne, SyncedState } from "./logic.ts";

const host = `localhost:${WebSocketPort}`;

const $history = document.getElementById('$history') as HTMLElement;
const $messageForm = document.getElementById('$messageForm') as HTMLElement;
const $name = document.getElementById('$name') as HTMLInputElement;
const $message = document.getElementById('$message') as HTMLInputElement;


let syncedState: SyncedState = EmptySyncedState;


function sendString(s: string) {
	socket.send(s);
}
function sendCommand(command: Commands.ServerCommand) {
	const str = JSON.stringify(command);
	sendString(str);
}
function sendAction(action: Actions.Action) {
	const command = Commands.serverPerform(action);
	sendCommand(command);
}


function addMessage(m: Message) {
	const el = document.createElement('div');
	el.innerHTML = `<b>${m.name}</b>: ${m.message}`;
	$history.appendChild(el);
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
	const command = JSON.parse(e.data) as Commands.ClientCommand;

	switch (command.type) { 
		case Commands.ClientCommandType.SetSyncedState:
			break;

		case Commands.ClientCommandType.ConfirmSign:
			break;

		case Commands.ClientCommandType.FailedSign:
			break;

		case Commands.ClientCommandType.Perform:
			const action = command.action;
			console.log('Performing action:', action);
			if (performOne(syncedState, action))
				renderState();
			break;

		default:
			assertNever(command);
	}
};

$messageForm.onsubmit = (e: Event) => {
	e.preventDefault();
	
	const mes: Message = {
		name: $name.value,
		message: $message.value
	};
	console.log('Submitting:', mes);

	sendAction(Actions.addMessage($message.value));
	
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
