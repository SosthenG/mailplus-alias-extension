import {Client} from '../client.js';

const msg_container = document.getElementById('message');
const text_msg = document.getElementById('text-msg');
const close_msg = document.getElementById('close-msg');

export async function loadPopup(name) {
    msg_container.className = '';

    document.querySelectorAll('script[data-loaded="true"]').forEach((elem) => {
        elem.remove();
    });

    let container = document.querySelector('main');
    container.setAttribute('aria-busy', true);
    container.innerHTML = '';

    let res = await fetch(`${name}/${name}.html`);

    container.innerHTML = await res.text();
    container.removeAttribute('aria-busy');

    let script = document.createElement('script');
    script.src = `${name}/${name}.js`;
    script.type = 'module';
    script.setAttribute('data-loaded', 'true');
    document.querySelector('body').appendChild(script);
}

let timeout;
export function showMessage(message, status = 'error', hide_delay = 5000) {
    clearTimeout(timeout);
    msg_container.className = 'active';
    text_msg.innerHTML = message;
    msg_container.classList.add(status);
    timeout = setTimeout(() => {
        msg_container.className = '';
    }, hide_delay);
    close_msg.addEventListener('click', () => {
        clearTimeout(timeout);
        msg_container.className = '';
    });
}

export const client = new Client();

client.loadSavedConf().then(async (ok) => {
    loadPopup((ok ? 'main' : 'init'));
});