import { assertNever } from "./common.ts";
import * as Actions from './actions.ts';
import * as Units from './units.ts';

export const ServerId = -123;

export const HumanTeam = 1;
export const ComputerTeam = 2;

export type Player = {
	id: number,
	username: string,
	controlledUnitId: number,
};
export type Message = {
	authorId: number,
	text: string,
}

export type SyncedState = {
	players: Map<number, Player>,
	messages: Message[],
	units: Map<number, Units.Unit>,
};

export const EmptySyncedState: SyncedState = {
	players: new Map<number, Player>(),
	messages: [],
	units: new Map<number, Units.Unit>(),
};

// Line:
// if (initiatorId != null)
// is equivalent to having access to initiatorId
// => it's executed on the server
// => Extra checks necessary
const performOne = (state: SyncedState, action: Actions.Action, initiatorId: number | null): boolean => {
	switch (action.type) {
		case Actions.ActionType.AddMessage:
			if (initiatorId != null) {
				if (action.authorId != initiatorId)
					return false;
			}

			state.messages.push({
				authorId: action.authorId,
				text: action.text,
			});
			return true;
		
		case Actions.ActionType.CreatePlayer:
			if (initiatorId != null) {
				if (initiatorId != ServerId)
					return false;
			}

			state.players.set(action.id, {
				id: action.id,
				username: action.username,
				controlledUnitId: action.controlledUnitId,
			});
			return true;
		
		case Actions.ActionType.CreateUnit:
			if (initiatorId != null) {
				if (initiatorId != ServerId)
					return false;
			}

			state.units.set(action.id, action.unit);
			return true;

		case Actions.ActionType.UnitSetPos: {
			if (initiatorId != null) {
				// Can't control units other than your own, unless you are the server
				if (initiatorId != ServerId &&
					state.players.get(initiatorId)?.controlledUnitId != action.unitId)
					return false;
				// TODO: there should also be a check for moved distance to be within possible range
			}
			
			const u = state.units.get(action.unitId);
			if (u == undefined) {
				// TODO: this shouldn't happen. Log error
				return false;
			} else {
				u.pos = action.pos;
				return true;
			}
		}

		default:
			assertNever(action);
	}
};

// Two separate method groups (client/server) because client doesn't need to know initiatorId,
// Meanwhile server code HAS TO provide initiatorId, to check for action validity

export const performOneServer = (state: SyncedState, action: Actions.Action, initiatorId: number): boolean =>
	performOne(state, action, initiatorId);

export const performManyServer = (state: SyncedState, actions: Actions.Action[], initiatorId: number): boolean => {
	let fullSuccess = true;
	for (const action of actions)
		if (!performOneServer(state, action, initiatorId))
			fullSuccess = false;
	return fullSuccess;
};

export const performOneClient = (state: SyncedState, action: Actions.Action): boolean =>
	performOne(state, action, null);

export const performManyClient = (state: SyncedState, actions: Actions.Action[]): boolean => {
	let fullSuccess = true;
	for (const action of actions)
		if (!performOneClient(state, action))
			fullSuccess = false;
	return fullSuccess;
};
