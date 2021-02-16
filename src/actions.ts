

export enum Type {
	AddMessage = 'addMessage',
};

export type ActionMessage = {
	type: Type.AddMessage,
	text: string
};

export const addMessage = (text: string) => ({
    type: Type.AddMessage,
    text
});

export type Action =
	ActionMessage;

