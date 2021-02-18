import * as Actions from './actions.ts';
import { SyncedState } from './logic.ts';

// TODO: Client and Server logically share the same "Perform" command,
// but client and server versions had to be implemented as two separate commands
// because of types. What can be done about it? 

export enum ServerCommandType {
	SignWithCredentials = 'signWithCredentials',
	SignWithToken = 'signWithToken',
	Register = 'register',
	Perform = 'do',
}

// ----- ----- ----- Server Command Types ----- ----- -----

export type CommandSignWithCredentials = {
	type: ServerCommandType.SignWithCredentials,
	username: string,
	password: string,
}

export type CommandSignWithToken = {
	type: ServerCommandType.SignWithToken,
	token: string,
}

export type CommandRegister = {
	type: ServerCommandType.Register,
	username: string,
	password: string,
}

export type CommandServerPerform = {
	type: ServerCommandType.Perform,
	action: Actions.Action,
}

// ----- ----- ----- Server Command Creators ----- ----- -----

export const signWithCredentials = (username: string, password: string): CommandSignWithCredentials => ({
	type: ServerCommandType.SignWithCredentials,
	username,
	password,
});

export const signWithToken = (token: string): CommandSignWithToken => ({
	type: ServerCommandType.SignWithToken,
	token,
});

export const register = (username: string, password: string): CommandRegister => ({
	type: ServerCommandType.Register,
	username,
	password,
});

export const serverPerform = (action: Actions.Action): CommandServerPerform => ({
	type: ServerCommandType.Perform,
	action,
});

export type ServerCommand = 
	CommandRegister
	| CommandSignWithCredentials
	| CommandSignWithToken
	| CommandServerPerform;





// -----------------------------------------------
// Client side

export enum ClientCommandType {
	SetSyncedState = 'setSyncedState',
	ConfirmSign = 'confirmSign',
	FailedSign = 'failedSign',
	Perform = 'do',
	PerformMany = 'dos',
}

// ----- ----- ----- Client Command Types ----- ----- -----

export type CommandSetSyncedState = {
	type: ClientCommandType.SetSyncedState,
	state: SyncedState,
}

export type CommandConfirmSign = {
	type: ClientCommandType.ConfirmSign,
	id: number,
	token: string,
}

export type CommandFailedSign = {
	type: ClientCommandType.FailedSign,
	errorMessage: string,
}

export type CommandClientPerform = {
	type: ClientCommandType.Perform,
	action: Actions.Action,
}

export type CommandClientPerformMany = {
	type: ClientCommandType.PerformMany,
	actions: Actions.Action[],
}

// ----- ----- ----- Client Command Creators ----- ----- -----

export const setSyncedState = (newSyncedState: SyncedState): CommandSetSyncedState => ({
	type: ClientCommandType.SetSyncedState,
	state: newSyncedState,
});

export const confirmSign = (id: number, token: string): CommandConfirmSign => ({
	type: ClientCommandType.ConfirmSign,
	id,
	token,
});

export const failedSign = (errorMessage: string): CommandFailedSign => ({
	type: ClientCommandType.FailedSign,
	errorMessage,
});

export const clientPerform = (action: Actions.Action): CommandClientPerform => ({
	type: ClientCommandType.Perform,
	action,
});

export const clientPerformMany = (actions: Actions.Action[]): CommandClientPerformMany => ({
	type: ClientCommandType.PerformMany,
	actions,
});

/*
export type ClientCommand = 
	ReturnType<typeof setSyncedState>
	| ReturnType<typeof confirmSign>
	| ReturnType<typeof failedSign>
	| ReturnType<typeof clientPerform>;
*/

export type ClientCommand = 
	CommandSetSyncedState
	| CommandConfirmSign
	| CommandFailedSign
	| CommandClientPerform
	| CommandClientPerformMany;
