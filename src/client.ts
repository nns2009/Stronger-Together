import { WebSocketPort, WebSocketEndpoint, HistoryEndpoint } from './info.ts';
import { Message } from './common.ts';

const host = `localhost:${WebSocketPort}`;

const $history = document.getElementById('$history') as HTMLElement;
const $messageForm = document.getElementById('$messageForm') as HTMLElement;
const $name = document.getElementById('$name') as HTMLInputElement;
const $message = document.getElementById('$message') as HTMLInputElement;

function addMessage(m: Message) {
	const el = document.createElement('div');
	el.innerHTML = `<b>${m.name}</b>: ${m.message}`;
	$history.appendChild(el);
}

let socket = new WebSocket(`ws://${host}/${WebSocketEndpoint}`);
socket.onopen = e => {
	console.info('Connected!');
};
socket.onerror = e => {
	console.log('Error connecting:');
	console.warn(e);
};
socket.onmessage = e => {
	const mes: Message = JSON.parse(e.data);
	console.log(`Received via WebSocket: "${mes}"`);

	addMessage(mes);
};

$messageForm.onsubmit = (e: Event) => {
	e.preventDefault();
	
	const mes: Message = {
		name: $name.value,
		message: $message.value
	};
	console.log('Submitting:', mes);
	
	socket.send(JSON.stringify(mes));
	$message.value = '';
};

async function loadInitialHistory() {
	const res = await fetch(`http://${host}/${HistoryEndpoint}`, {
	});
	const initialHistory: Message[] = await res.json();
	for (const mes of initialHistory) {
		addMessage(mes);
	}
};
loadInitialHistory();

export {};
