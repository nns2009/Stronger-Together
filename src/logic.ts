import { assertNever } from "./common.ts";
import * as Actions from './actions.ts';

export const ServerId = -123;

type Player = {
	id: number,
	username: string
};
type Message = {
	authorId: number,
	text: string,
}

export type SyncedState = {
	players: Map<number, Player>,
	messages: Message[],
};

export const EmptySyncedState: SyncedState = {
	players: new Map<number, Player>(),
	messages: [],
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
			});
			return true;

		default:
			assertNever(action);
	}
};

// Two separate methods because client doesn't need to know initiatorId,
// Meanwhile server HAS TO provide initiatorId, to check for action validity

export const performOneServer = (state: SyncedState, action: Actions.Action, initiatorId: number): boolean =>
	performOne(state, action, initiatorId);

export const performOneClient = (state: SyncedState, action: Actions.Action): boolean =>
	performOne(state, action, null);
