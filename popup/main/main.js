import {client, showMessage} from '../popup.js';
import {isEmpty} from '../../client.js';

client.fetchDomains().then((returned_domains) => {
    if (returned_domains.length === 0) {
        showMessage('There is no domain on your server, please add one first.');
    } else {
        let domains = {};
        const container = document.querySelector("select#domain");
        let first = true;
        let saved_domain = client.getSavedDomain();
        for (let domain_key in returned_domains) {
            let domain = returned_domains[domain_key];
            domains[domain.domain_id] = domain.name;
            let option = document.createElement('option');
            option.value = domain.domain_id;
            option.text = domain.name;
            if (first && saved_domain === null) {
                option.selected = true;
                client.saveDomain(domain.domain_id, domain.name).then(() => {
                    loadAliases();
                }, (error) => {
                    showMessage('Cannot save domain: ' + error);
                });
            } else if (saved_domain !== null && saved_domain.id === domain.domain_id) {
                option.selected = true;
                loadAliases();
            }
            container.appendChild(option);
            first = false;
        }
        container.disabled = false;

        container.addEventListener('change', async (e) => {
            e.preventDefault();
            container.disabled = true;

            let domain_id = container.value;
            client.saveDomain(domain_id, domains[domain_id]).then(() => {
                loadAliases();
                container.disabled = false;
            }, (error) => {
                showMessage('Cannot save domain: ' + error);
                container.disabled = false;
            });
        });
    }
});

const aliases_container = document.getElementById('aliases-container');
const no_aliases = '<tr><td colspan="5">No aliases yet.</td></tr>';
var aliases = null;

function addAlias(alias, email, create = false) {
    if (aliases_container.innerHTML === no_aliases) {
        aliases_container.innerHTML = '';
    }

    let tr = aliases_container.insertRow();
    tr.setAttribute('data-alias', alias);

    let alias_td = tr.insertCell();
    alias_td.classList.add('alias');
    alias_td.appendChild(document.createTextNode(alias));

    let stats_td = tr.insertCell();
    stats_td.classList.add('stats');
    stats_td.setAttribute('data-tooltip', 'Forwards count');
    stats_td.appendChild(document.createTextNode('0'));

    let block_td = tr.insertCell();
    block_td.classList.add('block');
    block_td.setAttribute('data-tooltip', 'Disable (block) / Enable (forward)');

    let enable_label = document.createElement('label');
    enable_label.htmlFor = 'enable-' + alias;
    let enabled_checkbox = document.createElement('input');
    enabled_checkbox.type = 'checkbox';
    enabled_checkbox.id = 'enable-' + alias;
    enabled_checkbox.name = 'enable-' + alias;
    enabled_checkbox.disabled = !create; // If we created a new alias, it is enabled by default
    enabled_checkbox.checked = true;
    enabled_checkbox.setAttribute('role', 'switch');
    enable_label.appendChild(enabled_checkbox);
    block_td.appendChild(enable_label);
    enabled_checkbox.addEventListener('change', () => {
        client.blockAlias(alias, !enabled_checkbox.checked).then((success) => {
            let state_str = enabled_checkbox.checked ? 'unblocked' : 'blocked';
            if (success) {
                showMessage(`"${alias}" as been ${state_str}!`, 'success');
            } else {
                showMessage(`Cannot ${state_str} alias "${alias}".`);
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
                    aliases_container.innerHTML = no_aliases;
                }
                showMessage(`Alias "${alias}" has been deleted.`, 'success');
            } else {
                showMessage(`Cannot delete alias "${alias}".`);
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
            showMessage(`"${email}" copied to your clipboard!`, 'success');
        });
    });
}

function loadAliases() {
    client.fetchAliases().then((fetched_aliases) => {
        aliases = fetched_aliases;
        if (isEmpty(aliases)) {
            aliases_container.innerHTML = no_aliases;
        } else {
            aliases_container.innerHTML = '';
            for (let alias in aliases) {
                addAlias(alias, aliases[alias]);
            }
        }

        // Add forward stats
        client.fetchStats().then((aliases_stats) => {
            for (let alias in aliases_stats) {
                let elem = document.querySelector('tbody > tr[data-alias="' + alias + '"] > td.stats');
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
    });
}

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
            showMessage(`"${result.new}" created and copied to your clipboard!`, 'success');
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