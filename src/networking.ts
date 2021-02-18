import { serialize, deserialize } from './serialization.ts';
import * as Commands from './commands.ts';
import * as Actions from './actions.ts';


export function netFunctions(socket: WebSocket) {
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

	return {
		sendString,
		sendCommand,
		sendAction,
	};
}
