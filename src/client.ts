// ----- ----- ----- More or less common stuff ----- ----- -----
import { serialize, deserialize } from './serialization.ts';
import { saveString, loadString } from './clientStorage.ts';
import {
	WebSocketPort, WebSocketEndpoint
} from './info.ts';
import { assertNever } from './common.ts';
import { vec } from "./math.ts";
import { netFunctions } from './networking.ts';

// ----- ----- ----- Game specific imports ----- ----- -----
import * as Commands from './commands.ts';
import * as Actions from './actions.ts';
import { EmptySyncedState, performManyClient, performOneClient, SyncedState, Player } from "./logic.ts";
import * as Units from "./units.ts";

const host = `localhost:${WebSocketPort}`;

let playerId: number | null = null;
let syncedState: SyncedState = EmptySyncedState;

// ----- ----- ----- Networking ----- ----- -----
let socket = new WebSocket(`ws://${host}/${WebSocketEndpoint}`);
const { sendString, sendCommand, sendAction } = netFunctions(socket);

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

// ----- ----- ----- Input ----- ----- -----
const pressed = new Map<string, boolean>();
onkeydown = e => {
	pressed.set(e.key.toLowerCase(), true);
	// console.log('d', e.key, e.keyCode);
};
onkeyup = e => {
	pressed.set(e.key.toLowerCase(), false);
	// console.log('u', e.key, e.keyCode);
}

const getKey = (char: string) => pressed.get(char) || false;
const getKeyInt = (char: string) => getKey(char) ? 1 : 0;
const getHorizontal = () => getKeyInt('d') - getKeyInt('a');
const getVertical = () => getKeyInt('s') - getKeyInt('w');

// ----- ----- ----- In game ----- ----- -----
const $history = elementById('$history');
const $messageForm = elementById('$messageForm');
const $message = inputById('$message');

const $canvas = tagById<HTMLCanvasElement>('$canvas');
const context = $canvas.getContext('2d') as CanvasRenderingContext2D; // Make type-checking exclude 'null' possibility


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

function drawCircle(x: number, y: number, radius: number, fillStyle: string) {
	context.beginPath();
	context.arc(x, y, radius, 0, 2 * Math.PI);
	context.fillStyle = fillStyle;
	context.fill();
}

let lastMsTime = 0;
function frame(msTime: number) {
	const deltaTime = (msTime - lastMsTime) / 1000;
	lastMsTime = msTime;

	if (playerId == null) {
		requestAnimationFrame(frame);
		return;
	}

	// ----- ----- ----- Update ----- ----- -----
	const myPlayer = syncedState.players.get(playerId) as Player;
	const myUnit = syncedState.units.get(myPlayer.controlledUnitId) as Units.Unit;
	const myClas = Units.unitClassByName(myUnit.className);

	const dx = getHorizontal() * myClas.movementSpeed * deltaTime;
	const dy = getVertical() * myClas.movementSpeed * deltaTime;
	if (dx != 0 || dy != 0) {
		sendAction(Actions.unitSetPos(
			myPlayer.controlledUnitId,
			vec(myUnit.pos.x + dx, myUnit.pos.y + dy)
		))
		//myUnit.pos.x += dx;
		//myUnit.pos.y += dy;
	}

	const w = $canvas.width;
	const h = $canvas.height;

	// ----- ----- ----- Drawing ----- ----- -----
	// Clear canvas
	context.resetTransform();
	context.fillStyle = '#f6f6f6';
	context.fillRect(0, 0, w, h);

	context.translate(w / 2, h / 2);
	context.scale(50, 50);

	context.translate(-myUnit.pos.x, -myUnit.pos.y);

	// ----- ----- ----- Debug display ----- ----- -----
	const gridGap = 1;
	const gridSpan = 20;
	context.beginPath();
	for (let i = -gridSpan; i <= gridSpan; i++) {
		// Horizontal line
		context.moveTo(-gridSpan * gridGap, i * gridGap);
		context.lineTo(gridSpan * gridGap, i * gridGap);

		// Vertical line
		context.moveTo(i * gridGap, -gridSpan * gridGap);
		context.lineTo(i * gridGap, gridSpan * gridGap);
	}
	context.lineWidth = 1 / 25;
	context.strokeStyle = 'lightgray';
	context.stroke();

	drawCircle(0, 0, 0.1, 'red');

	// ----- ----- ----- Game itself ----- ----- -----

	for (const [id, u] of syncedState.units) {
		drawCircle(u.pos.x, u.pos.y, 0.3, 'black');
		if (id == myPlayer.controlledUnitId)
			drawCircle(u.pos.x, u.pos.y, 0.1, 'yellow');
	}

	requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

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
			
			{
				const win: any = window; // Surpress TypeScript type warning
				win.st = syncedState; // For easy access for debugging
			}
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
			//console.log('Performing action:', action);
			if (performOneClient(syncedState, action))
				renderState(); // TODO: might not be necessary since canvas is redrawed every frame anyway
			break;

		case Commands.ClientCommandType.PerformMany:
			const { actions } = command;
			if (performManyClient(syncedState, actions))
				renderState(); // TODO: might not be necessary since canvas is redrawed every frame anyway
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
