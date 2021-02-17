

export enum ActionType {
	AddMessage = 'addMessage',
	CreatePlayer = 'createPlayer',
};

// ----- ----- ----- Action Types ----- ----- -----

export type ActionCreatePlayer = {
	type: ActionType.CreatePlayer,
	id: number,
	username: string,
};

export type ActionMessage = {
	type: ActionType.AddMessage,
	authorId: number,
	text: string,
};


// ----- ----- ----- Action Creators ----- ----- -----

export const createPlayer = (id: number, username: string): ActionCreatePlayer => ({
	type: ActionType.CreatePlayer,
	id,
	username,
});

export const addMessage = (authorId: number, text: string): ActionMessage => ({
    type: ActionType.AddMessage,
	authorId,
    text,
});

export type Action =
	ActionMessage
	| ActionCreatePlayer;

