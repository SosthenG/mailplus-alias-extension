import { client, showMessage, loadPopup } from '../popup.js';

function init(add_event_listener = true) {
    document.getElementById('back-arrow').classList.remove('visible');

    client.fetchDomains().then((returned_domains) => {
        if (returned_domains.length === 0) {
            showMessage('There is no domain on your server, please add one first.');
        } else {
            let domains = {};
            const container = document.querySelector("#domains-container");
            let first = true;
            for (let domain_id in returned_domains) {
                let domain = returned_domains[domain_id];
                domains[domain.domain_id] = domain.name;
                let label = document.createElement('label');
                label.htmlFor = domain.domain_id;
                let input = document.createElement('input');
                input.type = 'radio';
                input.id = domain.domain_id;
                input.name = 'domain';
                input.value = domain.domain_id;
                if (first) {
                    input.checked = true;
                }
                let text = document.createTextNode(domain.name);
                label.appendChild(input);
                label.appendChild(text);
                container.appendChild(label);
                first = false;
            }
            const btn = document.forms['config'].querySelector('button');
            btn.disabled = false;

            document.forms['config'].addEventListener('submit', async (e) => {
                e.preventDefault();
                btn.setAttribute('aria-busy', 'true');
                const formData = new FormData(e.target);

                let domain_id = formData.get('domain');
                client.saveDomain(domain_id, domains[domain_id]).then(() => {
                    loadPopup('main');
                }, (error) => {
                    btn.removeAttribute('aria-busy');
                    showMessage('Cannot save domain: ' + error);
                });
            });
        }
    });

    if (add_event_listener) {
        document.getElementById('current-page').addEventListener('change', (e) => {
            if (e.target.value === 'config') {
                init(false);
            }
        });
    }
}

init();