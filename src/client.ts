import { serialize, deserialize } from './serialization.ts';
import { saveString, loadString } from './clientStorage.ts';
import {
	WebSocketPort, WebSocketEndpoint
} from './info.ts';
import { assertNever } from './common.ts';
import * as Commands from './commands.ts';
import * as Actions from './actions.ts';
import { EmptySyncedState, performOneClient, SyncedState } from "./logic.ts";

const host = `localhost:${WebSocketPort}`;

let playerId: number | null = null;
let syncedState: SyncedState = EmptySyncedState;

// ----- ----- ----- Networking ----- ----- -----
function sendString(s: string) {
	socket.send(s);
}
function sendCommand(command: Commands.ServerCommand) {
	const str = serialize(command);
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




function addMessage(m: { name: string, message: string }) {
	const el = document.createElement('div');
	el.innerHTML = `<b>${m.name}</b>: ${m.message}`;
	$history.appendChild(el);
}

function renderState() {
	$history.textContent = '';
	for (const s of syncedState.messages) {
		addMessage({
			name: syncedState.players.get(s.authorId)?.username || '?Err?',
			message: s.text,
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
	const command = deserialize<Commands.ClientCommand>(e.data);

	switch (command.type) { 
		case Commands.ClientCommandType.SetSyncedState:
			syncedState = command.state;
			renderState();
			break;

		case Commands.ClientCommandType.ConfirmSign:
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
			if (performOneClient(syncedState, action))
				renderState();
			break;

		default:
			assertNever(command);
	}
};

$messageForm.onsubmit = (e: Event) => {
	e.preventDefault();

	if (playerId == null) {
		console.warn("playerId == null - this shouldn't happen!");
	} else {
		sendAction(Actions.addMessage(playerId, $message.value));
		$message.value = '';
	}
};

export {};
