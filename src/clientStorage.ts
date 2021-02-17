// ----- ----- ----- Storage ----- ----- -----

export function saveString(key: string, value: string) {
	localStorage.setItem(key, value);
}
export function loadString(key: string): string | undefined {
	return localStorage.getItem(key);
}
