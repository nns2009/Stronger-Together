import * as Actions from './actions.ts';

export interface SyncedState {
	messages: string[]
}

export const EmptySyncedState = {
	messages: []
};

const addm = 'addMessage';

export const performOne = (state: SyncedState, action: Actions.Action): boolean => {
	switch (action.type) {
		case Actions.Type.AddMessage:
			state.messages.push(action.text);
			return true;
	}
};