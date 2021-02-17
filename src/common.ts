
export function assertNever(x: never): never {
	throw new Error("Unexpected object: " + x);
}

export interface Message {
	message: string,
	name: string,
};
