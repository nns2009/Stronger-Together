
interface Vector {
	x: number,
	y: number,
}

export const sqr = (x: number) => x * x;

export const sqrDist = (a: Vector, b: Vector): number => {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy;
};

