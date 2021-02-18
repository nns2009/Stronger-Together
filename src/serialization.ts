
// Code from: https://stackoverflow.com/questions/29085197/how-do-you-json-stringify-an-es6-map

function replacer(key: string, value: any) {
	if (value instanceof Map) {
		return {
			dataType: 'Map',
			value: [...value.entries()],
		};
	} else {
		return value;
	}
}
function reviver(key: string, value: any) {
	if (typeof value === 'object' && value !== null) {
		if (value.dataType === 'Map') {
			return new Map(value.value);
		}
	}
	return value;
}

export function serialize(obj: any) {
	return JSON.stringify(obj, replacer);
}
export function deserialize<T>(s: string): T {
	return JSON.parse(s, reviver) as T;
}
