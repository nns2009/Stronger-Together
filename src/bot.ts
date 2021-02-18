// ----- ----- ----- More or less common stuff ----- ----- -----
import { deserialize } from './serialization.ts';
import {
	WebSocketPort, WebSocketEndpoint
} from './info.ts';
import { assertNever } from './common.ts';
import { add, len, mul, sub, vec, Vector } from "./math.ts";
import { netFunctions } from './networking.ts';


// ----- ----- ----- Game specific imports ----- ----- -----
import * as Commands from './commands.ts';
import * as Actions from './actions.ts';
import { EmptySyncedState, performManyClient, performOneClient, SyncedState, Player } from "./logic.ts";
import * as Units from "./units.ts";

export function bot(username: string, password: string, targetPos: Vector) {
	const host = `localhost:${WebSocketPort}`;
	
	let playerId: number | null = null;
	let syncedState: SyncedState | null = null;
	
	let socket = new WebSocket(`ws://${host}/${WebSocketEndpoint}`);
	const { sendString, sendCommand, sendAction } = netFunctions(socket);
	
	const loginMethods = [
		() => sendCommand(Commands.signWithCredentials(username, password)),
		() => sendCommand(Commands.register(username, password)),
	];
	let loginMethodIndex = 0;

	function tryNextLoginMethod() {
		if (loginMethodIndex >= loginMethods.length) {
			const errorMessage = `Couldn't log in or register with username=${username} password=${password}. Sad:(`;

			console.error(errorMessage);
			throw new Error(errorMessage);
		}
		loginMethods[loginMethodIndex++]();
	}
	
	socket.onopen = e => {
		console.info('Connected!');
		tryNextLoginMethod();
	};
	socket.onerror = e => {
		console.error('Socket error:');
		console.error(e);
		console.error('Aborting');
		throw new Error('Socket error');
	};
	socket.onmessage = e => {
		const command = deserialize<Commands.ClientCommand>(e.data);
	
		switch (command.type) { 
			case Commands.ClientCommandType.SetSyncedState:
				console.log('Received syncedState');
				syncedState = command.state;
				
				{
					const win: any = window; // Surpress TypeScript type warning
					win.st = syncedState; // For easy access for debugging
				}
				break;
	
			case Commands.ClientCommandType.ConfirmSign:
				console.log('Confirmed Sign');
				playerId = command.id;
				break;
	
			case Commands.ClientCommandType.FailedSign:
				console.log('Failed sign with loginMethodIndex:', loginMethodIndex - 1);
				tryNextLoginMethod();
				break;
	
			case Commands.ClientCommandType.Perform:
				if (syncedState == null) {
					console.error("ecieved perform command before receiving syncedState, this shouldn't happen. Command:", command);
					break;
				}
				const action = command.action;
				performOneClient(syncedState, action);
				break;
	
			case Commands.ClientCommandType.PerformMany:
				if (syncedState == null) {
					console.error("ecieved performMany command before receiving syncedState, this shouldn't happen. Command:", command);
					break;
				}
				const { actions } = command;
				performManyClient(syncedState, actions);
				break;
	
			default:
				assertNever(command);
		}
	};

	// ----- ----- ----- Bot AI ----- ----- -----


	const updateFrequency = 60;
	const deltaTime = 1 / updateFrequency;

	function startAI() {
		setInterval(update, 1000 / updateFrequency);
	}

	const squareSide = 2;
	const points = [
		add(targetPos, vec(0, 0)),
		add(targetPos, vec(squareSide, 0)),
		add(targetPos, vec(squareSide, squareSide)),
		add(targetPos, vec(0, squareSide)),
	];
	let currentPointIndex = 0;

	function update() {
		if (playerId == null || syncedState == null)
			return;
		
		const myPlayer = syncedState.players.get(playerId) as Player;
		const myUnit = syncedState.units.get(myPlayer.controlledUnitId) as Units.Unit;
		const myClas = Units.unitClassByName(myUnit.className);

		const maxDeltaDist = deltaTime * myClas.movementSpeed;

		const target = points[currentPointIndex];
		const dir = sub(target, myUnit.pos);
		const dirLen = len(dir);

		let nextPos: Vector;
		if (dirLen <= maxDeltaDist) {
			nextPos = target;
			currentPointIndex = (currentPointIndex + 1) % points.length;
		} else {
			nextPos = add(myUnit.pos, mul(dir, maxDeltaDist / dirLen));
		}
		sendAction(Actions.unitSetPos(myPlayer.controlledUnitId, nextPos));
	}

	startAI();
}

if (import.meta.main) {
	console.log(Deno.args);
	const username = Deno.args[0];
	const password = Deno.args[1];

	bot(username, password, vec(4, 3));
}
