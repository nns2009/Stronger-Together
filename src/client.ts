import {
	WebSocketPort, WebSocketEndpoint,
	HistoryEndpoint, SyncedStateEndpoint
} from './info.ts';
import { assertNever, Message } from './common.ts';
import * as Commands from './commands.ts';
import * as Actions from './actions.ts';
import { EmptySyncedState, performOne, SyncedState } from "./logic.ts";

const host = `localhost:${WebSocketPort}`;

let playerId: number | null = null;
let syncedState: SyncedState = EmptySyncedState;

// ----- ----- ----- Networking ----- ----- -----
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

// ----- ----- ----- HTML function ----- ----- -----

function tagById<T>(id: string) {
	return document.getElementById(id) as T;
}
function elementById(id: string) {
	return tagById<HTMLElement>(id);
}
function inputById(id: string) {
	return tagById<HTMLInputElement>(id);
}

// ----- ----- ----- Storage ----- ----- -----
function saveString(key: string, value: string) {
	localStorage.setItem(key, value);
}
function loadString(key: string): string | undefined {
	return localStorage.getItem(key);
}

// ----- ----- ----- Log in form ----- ----- -----
const $signFormModalContainer = elementById('$signFormModalContainer');
const $username = inputById('$username');
const $password = inputById('$password');
const $register = inputById('$register');
const $logIn = inputById('$logIn');
const $commentError = elementById('$commentError');

enum SignState {
	None = 'none',
	Trying = 'trying',
	Signed = 'signed',
};

let signState = SignState.None;
let signError = '';

function renderSignForm(state: SignState, error: string) {
	signState = state;
	signError = error;

	$signFormModalContainer.style.display =
		signState != SignState.Signed
			? ''
			: 'none';

	$username.disabled = $password.disabled = $register.disabled = $logIn.disabled =
		signState == SignState.Trying;

	$commentError.innerHTML = signError || '&nbsp;';
}

$register.onclick = (e: Event) => {
	e.preventDefault();
	renderSignForm(SignState.Trying, '');
	sendCommand(Commands.register($username.value, $password.value));
};
$logIn.onclick = (e: Event) => {
	e.preventDefault();
	renderSignForm(SignState.Trying, '');
	sendCommand(Commands.signWithCredentials($username.value, $password.value));
};

renderSignForm(SignState.Trying, '');

// ----- ----- ----- In game ----- ----- -----
const $history = elementById('$history');
const $messageForm = elementById('$messageForm');
const $name = inputById('$name');
const $message = inputById('$message');




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

	let token = loadString('token');
	if (token) {
		console.info(`Attempting to log in by token: ${token}`);
		renderSignForm(SignState.Trying, '');
		sendCommand(Commands.signWithToken(token));
	} else {
		renderSignForm(SignState.None, '');
	}
};
socket.onerror = e => {
	console.log('Error connecting:');
	console.warn(e);
};
socket.onmessage = e => {
	const command = JSON.parse(e.data) as Commands.ClientCommand;

	switch (command.type) { 
		case Commands.ClientCommandType.SetSyncedState:
			syncedState = command.state;
			renderState();
			break;

		case Commands.ClientCommandType.ConfirmSign:
			// TODO: save id and token
			playerId = command.id;
			let token = command.token;
			saveString('token', token);
			console.info(`Sign in successfull! Token: ${token}`);

			renderSignForm(SignState.Signed, '');
			break;

		case Commands.ClientCommandType.FailedSign:
			renderSignForm(SignState.None, command.errorMessage);
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
	sendAction(Actions.addMessage($message.value));
	$message.value = '';
};

export {};
