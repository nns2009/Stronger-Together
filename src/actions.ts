import { Vector } from "./math.ts";
import { Unit } from "./units.ts";


export enum ActionType {
	AddMessage = 'addMessage',
	CreatePlayer = 'createPlayer',
	CreateUnit = 'createUnit',
	UnitSetPos = 'unitSetPos',
};

// ----- ----- ----- Action Types ----- ----- -----

export type ActionCreatePlayer = {
	type: ActionType.CreatePlayer,
	id: number,
	username: string,
	controlledUnitId: number,
};

export type ActionMessage = {
	type: ActionType.AddMessage,
	authorId: number,
	text: string,
};

export type ActionCreateUnit = {
	type: ActionType.CreateUnit,
	id: number,
	unit: Unit,
}

export type ActionUnitSetPos = {
	type: ActionType.UnitSetPos,
	unitId: number,
	pos: Vector,
}


// ----- ----- ----- Action Creators ----- ----- -----

export const createPlayer = (id: number, username: string, controlledUnitId: number): ActionCreatePlayer => ({
	type: ActionType.CreatePlayer,
	id,
	username,
	controlledUnitId,
});

export const addMessage = (authorId: number, text: string): ActionMessage => ({
    type: ActionType.AddMessage,
	authorId,
    text,
});

export const createUnit = (id: number, unit: Unit): ActionCreateUnit => ({
	type: ActionType.CreateUnit,
	id,
	unit,
});

export const unitSetPos = (unitId: number, pos: Vector): ActionUnitSetPos => ({
	type: ActionType.UnitSetPos,
	unitId,
	pos,
});

export type Action =
	ActionMessage
	| ActionCreatePlayer
	| ActionCreateUnit
	| ActionUnitSetPos;

