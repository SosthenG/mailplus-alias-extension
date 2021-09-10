import { client, showMessage, loadPopup } from '../popup.js';
import { isEmpty } from '../../client.js';

function init(add_event_listener = true) {
    let back_arrow = document.getElementById('back-arrow');
    back_arrow.classList.add('visible');
    if (add_event_listener) {
        back_arrow.addEventListener('click', () => {
            loadPopup('config');
        });
    }

    client.fetchAliases().then((aliases) => {
        let container = document.getElementById('aliases-container');

        const no_aliases = '<tr><td colspan="6">No aliases yet.</td></tr>';

        function addAlias(alias, email, create = false) {
            if (container.innerHTML === no_aliases) {
                container.innerHTML = '';
            }

            let tr = container.insertRow();
            tr.setAttribute('data-alias', alias);

            let alias_td = tr.insertCell();
            alias_td.colSpan = 2;
            alias_td.classList.add('alias');
            alias_td.appendChild(document.createTextNode(email));

            let stats_td = tr.insertCell();
            stats_td.classList.add('stats');
            stats_td.setAttribute('data-tooltip', 'Forwards count');
            let number_span = document.createElement('span');
            number_span.classList.add('number');
            number_span.appendChild(document.createTextNode('0'));
            stats_td.appendChild(number_span);
            let stats_btn = document.createElement('i');
            stats_btn.classList.add('gg-mail-forward', 'mr-1');
            stats_td.appendChild(stats_btn);

            let block_td = tr.insertCell();
            block_td.classList.add('block');
            block_td.setAttribute('data-tooltip', 'Disable (block) / Enable (forward)');

            let block_label = document.createElement('label');
            block_label.htmlFor = 'enable-' + alias;
            let block_checkbox = document.createElement('input');
            block_checkbox.type = 'checkbox';
            block_checkbox.id = 'enable-' + alias;
            block_checkbox.name = 'enable-' + alias;
            block_checkbox.disabled = !create; // If we created a new alias, it is enabled by default
            block_checkbox.checked = true;
            block_checkbox.setAttribute('role', 'switch');
            block_label.appendChild(block_checkbox)
            block_td.appendChild(block_label);
            block_checkbox.addEventListener('change', () => {
                client.blockAlias(alias, !block_checkbox.checked).then((success) => {
                    if (!success) {
                        showMessage('Cannot block/unblock alias ' + alias);
                    }
                });
            });

            let delete_td = tr.insertCell();
            delete_td.classList.add('delete');
            let delete_btn = document.createElement('i');
            delete_btn.classList.add('gg-trash');
            delete_td.appendChild(delete_btn);
            delete_td.setAttribute('data-tooltip', 'Delete');
            delete_td.addEventListener('click', () => {
                client.deleteAlias(alias).then((new_aliases) => {
                    if (new_aliases !== null) {
                        tr.remove();
                        aliases = new_aliases;
                        if (isEmpty(aliases)) {
                            container.innerHTML = no_aliases;
                        }
                    } else {
                        showMessage('Cannot delete alias ' + alias);
                    }
                });
            });

            let copy_td = tr.insertCell();
            copy_td.classList.add('copy');
            let copy_btn = document.createElement('i');
            copy_btn.classList.add('gg-copy');
            copy_td.appendChild(copy_btn);
            copy_td.setAttribute('data-tooltip', 'Copy');
            copy_td.addEventListener('click', () => {
                navigator.clipboard.writeText(email).then(() => {
                    copy_btn.classList.add('green');
                    copy_td.setAttribute('data-tooltip', 'OK!');
                    setTimeout(() => {
                        copy_btn.classList.remove('green');
                        copy_td.setAttribute('data-tooltip', 'Copy');
                    }, 2000);
                });
            });
        }

        if (isEmpty(aliases)) {
            container.innerHTML = no_aliases;
        } else {
            container.innerHTML = '';
            for (let alias in aliases) {
                addAlias(alias, aliases[alias]);
            }
        }
        container.removeAttribute('aria-busy');

        // Add forward stats
        client.fetchStats().then((aliases_stats) => {
            for (let alias in aliases_stats) {
                let elem = document.querySelector('tbody > tr[data-alias="' + alias + '"] > td.stats > span.number');
                if (elem !== null) {
                    elem.innerHTML = aliases_stats[alias];
                }
            }
        });

        client.fetchBlacklist().then((blacklist) => {
            document.querySelectorAll('tbody > tr[data-alias] > td.block input[type="checkbox"]').forEach((checkbox) => {
                checkbox.disabled = false;
            });
            for (let alias in blacklist) {
                let alias_blocked_checkbox = document.querySelector('tbody > tr[data-alias="' + alias + '"] > td.block input[type="checkbox"]');
                if (alias_blocked_checkbox) {
                    alias_blocked_checkbox.checked = !(alias in blacklist && blacklist[alias].enabled === true);
                }
            }
        });

        const btn = document.forms['add-alias'].querySelector('button');
        const aliasNameInput = document.forms['add-alias'].querySelector('input[type="text"]');
        document.forms['add-alias'].addEventListener('submit', async (e) => {
            e.preventDefault();
            btn.setAttribute('aria-busy', 'true');
            aliasNameInput.disabled = true;

            client.createAlias(aliasNameInput.value).then((result) => {
                btn.removeAttribute('aria-busy');
                if (!isEmpty(result)) {
                    aliases = result.aliases;
                    addAlias(result.new, aliases[result.new], true);
                    aliasNameInput.disabled = false;
                    aliasNameInput.value = '';

                    navigator.clipboard.writeText(aliases[result.new]); // Copy to clipboard
                } else {
                    showMessage('Cannot create alias !');
                    aliasNameInput.disabled = false;
                }
            }, (error) => {
                btn.removeAttribute('aria-busy');
                showMessage('Cannot create alias: ' + error);
                aliasNameInput.disabled = false;
            });
        });

    });

    if (add_event_listener) {
        document.getElementById('current-page').addEventListener('change', (e) => {
            if (e.target.value === 'main') {
                init(false);
            }
        });
    }
}

init();