import { Client } from '../client.js';

const evt = document.createEvent("HTMLEvents");
evt.initEvent("change", false, true);
const msgContainer = document.getElementById('message');

export async function loadPopup(name) {
    msgContainer.innerHTML = '';
    msgContainer.className = 'hidden';

    document.querySelectorAll('script[data-loaded="true"]').forEach((elem) => {
       elem.remove();
    });

    let container = document.querySelector('main');
    container.setAttribute('aria-busy', true);

    let res = await fetch(`${name}/${name}.html`);

    container.innerHTML = await res.text();
    container.removeAttribute('aria-busy');

    let script = document.createElement('script');
    script.src = `${name}/${name}.js`;
    script.type = 'module';
    script.setAttribute('data-loaded', 'true');
    document.querySelector('body').appendChild(script);

    let current_page_input = document.getElementById('current-page');
    current_page_input.value = name;
    current_page_input.dispatchEvent(evt);
}

export function showMessage(message, status = 'error', hide_delay = 5000) {
    msgContainer.className = '';
    msgContainer.innerHTML = message;
    msgContainer.classList.add(status);
    setTimeout(() => {
        msgContainer.innerHTML = '';
        msgContainer.className = 'hidden';
    }, hide_delay);
}

export const client = new Client();

client.loadSavedConf().then(async (status) => {
    loadPopup(status);
});