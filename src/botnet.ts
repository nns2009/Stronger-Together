import { vec } from "./math.ts";
import { bot } from "./bot.ts";

function botNet(xsize: number, ysize: number, side: number) {
	for (let x = 0; x < xsize; x++) {
		for (let y = 0; y < ysize; y++) {
			const botname = `bot[${x},${y}]`;
			bot(botname, botname, vec(x * side, y * side));
		}
	}
}

if (import.meta.main) {
	if (Deno.args.length < 3) {
		console.error('Three arguments needed: x, y, side');
		throw 'Not enough arguments';
	}
	let x = parseInt(Deno.args[0]);
	let y = parseInt(Deno.args[1]);
	let side = parseFloat(Deno.args[2]);

	botNet(x, y, side);
}
