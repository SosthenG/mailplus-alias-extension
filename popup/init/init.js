import {client, showMessage, loadPopup} from '../popup.js';

let btn = document.forms['init'].querySelector('button');
document.forms['init'].addEventListener('submit', async (e) => {
    e.preventDefault();
    btn.setAttribute('aria-busy', true);
    const formData = new FormData(e.target);

    client.url = formData.get('url');
    let ping = await client.ping();

    if (!ping) {
        btn.removeAttribute('aria-busy');
        showMessage('Cannot find the Synology server or version is not supported.');
        return;
    }

    const login_ok = await client.login(formData.get('username'), formData.get('password'), formData.get('otp'));

    if (login_ok) {
        loadPopup('main');
    } else {
        btn.removeAttribute('aria-busy');
        showMessage('Login, password or OTP invalid.');
    }

});