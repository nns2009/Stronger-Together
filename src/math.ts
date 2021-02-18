

export const random = (min: number, max: number) =>
    min + Math.random() * (max - min);

export type Vector = {
	x: number,
	y: number,
}

export const vec = (x: number, y: number): Vector => ({ x, y });

export const sqr = (x: number) => x * x;

export const sqrDist = (a: Vector, b: Vector): number => {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy;
};

