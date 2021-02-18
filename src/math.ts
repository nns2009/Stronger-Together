

export const random = (min: number, max: number) =>
    min + Math.random() * (max - min);

export type Vector = {
	x: number,
	y: number,
}

export const vec = (x: number, y: number): Vector => ({ x, y });
export const add = (a: Vector, b: Vector): Vector => vec(a.x + b.x, a.y + b.y);
export const sub = (a: Vector, b: Vector): Vector => vec(a.x - b.x, a.y - b.y);
export const mul = (a: Vector, k: number): Vector => vec(a.x * k, a.y * k);
export const len = (v: Vector): number => Math.sqrt(v.x ** 2 + v.y ** 2);

export const sqr = (x: number) => x * x;

export const sqrDist = (a: Vector, b: Vector): number => {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy;
};

