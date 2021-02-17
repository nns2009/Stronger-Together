
// TODO: can this be used to break server at runtime with handcrafted Action/Command?
export function assertNever(x: never): never {
	throw new Error("Unexpected object: " + x);
}
