import { Vector } from "./math.ts";


export type UnitClass = {
	name: string,

	movementSpeed: number,
	rotationSpeed: number,

	maxHealth: number,
	healthRegeneration: number,

	damage: number,
	attackRadius: number,
	attackDelay: number,
};

const Warrior: UnitClass = {
	name: 'Warrior',

	movementSpeed: 3,
	rotationSpeed: 2,

	maxHealth: 100,
	healthRegeneration: 2,

	damage: 10,
	attackRadius: 1,
	attackDelay: 1.5,
};

const Archer: UnitClass = {
	name: 'Archer',

	movementSpeed: 4,
	rotationSpeed: 3,

	maxHealth: 50,
	healthRegeneration: 0.5,

	damage: 5,
	attackRadius: 7,
	attackDelay: 1.1,
};

const Healer: UnitClass = {
	name: 'Healer',

	movementSpeed: 5,
	rotationSpeed: 4,

	maxHealth: 80,
	healthRegeneration: 5,

	damage: 3,
	attackRadius: 1,
	attackDelay: 1.7,
};

export const Class = {
	Warrior,
	Archer,
	Healer,
};

export function unitClassByName(name: string): UnitClass {
	var cl: any = Class; // TODO: some non-strict type conversion, what can be done about it?
	return cl[name] as UnitClass;
}

export type Unit = {
	className: string,
	teamId: number,

	health: number,
	pos: Vector,

	lastAttackTime: number,
};

export const unit = (clas: UnitClass, teamId: number, pos: Vector) => ({
	className: clas.name,
	teamId,

	health: clas.maxHealth,
	pos,

	lastAttackTime: -10,
});
