export function isEmpty(value) {
    if (value === true) {
        return false;
    }
    return (value == null || value.length === 0 || Object.keys(value).length === 0);
}

export class Client {
    constructor() {
        this.complete_url = null;
        this.username = null;
        this.domain_id = null;
        this.domain_name = null;
        this.cookies_ok = false;
        this.blacklist = null;
        this.aliases = null;
        this.init_ok = false;
    }

    async loadSavedConf() {
        if (this.init_ok) {
            return true;
        }

        const saved_data = await browser.storage.local.get();
        this.complete_url = saved_data.complete_url;
        this.username = saved_data.username;
        this.domain_id = saved_data.domain_id;
        this.domain_name = saved_data.domain_name;
        this.cookies_ok = saved_data.cookies_ok;

        this.init_ok = !isEmpty(this.complete_url) && !isEmpty(this.username) && !isEmpty(this.cookies_ok);

        return this.init_ok;
    }

    set url(url) {
        this.complete_url = url + '/webapi/entry.cgi';
    }

    isUrlValid() {
        let url;
        try {
            url = new URL(this.complete_url);
        } catch (_) {
            return false;
        }

        return url.protocol === "http:" || url.protocol === "https:";
    }

    async ping() {
        const params = new URLSearchParams({
            api: 'SYNO.API.Info',
            version: '1',
            method: 'query',
            query: 'SYNO.API.Auth,SYNO.MailPlusServer.Domain.',
        });

        if (!this.isUrlValid()) {
            return false;
        }

        try {
            const response = await fetch(this.complete_url + '?' + params.toString());

            const status = (await response).status;

            if (status !== 200) {
                console.error('Invalid status code.');
                return false;
            }

            const result = await response.json();
            if (result.data['SYNO.API.Auth'] && result.data['SYNO.API.Auth'].minVersion <= 7 && result.data['SYNO.API.Auth'].maxVersion >= 7) {
                browser.storage.local.set({
                    complete_url: this.complete_url
                }).then(() => {
                }, () => {
                    console.error('Cannot save url to local storage!');
                });

                return true;
            }

            console.error('Unsupported SYNO.API.Auth version.');

            return false;
        } catch (e) {
            console.error(e);
            return false;
        }
    }

    async login(username, password, otp) {
        const params = new URLSearchParams({
            api: 'SYNO.API.Auth',
            version: '7',
            method: 'login',
            account: username,
            passwd: password,
            format: 'cookie'
        });
        if (otp) {
            params.append('otp_code', otp);
            params.append('enable_device_token', true);
            params.append('device_name', 'MailPlus-Alias-Extension');
        }
        const response = await fetch(this.complete_url + '?' + params.toString());

        const status = (await response).status;
        if (status !== 200) {
            console.error('Invalid status code.');
            return false;
        }

        const result = await response.json();
        if (!result.success) {
            console.error('Authentication failed.', result);
            return false;
        }

        this.username = username;
        this.cookies_ok = true;
        await browser.storage.local.set({
            username: this.username,
            cookies_ok: this.cookies_ok
        });

        return true;
    }

    async getResponse(params) {
        const response = await fetch(this.complete_url, {
            method: "POST",
            headers: new Headers({'Content-Type': 'application/x-www-form-urlencoded'}),
            credentials: "same-origin",
            body: params,
        });

        const status = (await response).status;
        if (status !== 200) {
            console.error('Invalid status code.');
            return null;
        }

        const result = await response.json();
        if (!result.success) {
            console.error('Request error', status, result, params.toString());
            if (result.error.code === 119) { // Session cookie probably invalid, disconnect
                this.saveCookiesOk(false).then(() => {
                    loadPopup('init');
                });
            }
            return null;
        }

        return result.data;
    }

    async fetchDomains() {
        const params = new URLSearchParams({
            api: 'SYNO.MailPlusServer.Domain',
            version: '1',
            method: 'list',
            offset: '0',
            limit: '-1',
        });

        const data = await this.getResponse(params);

        let domains = {};
        for (let key in data.domains) {
            // If user does not have access to the domain, remove it from the list
            let is_in_domain = await this.isUserInDomain(data.domains[key].domain_id);
            if (is_in_domain) {
                domains[data.domains[key].domain_id] = data.domains[key].name;
            }
        }

        return domains;
    }

    async isUserInDomain(domain_id) {
        const params = new URLSearchParams({
            api: 'SYNO.MailPlusServer.Util',
            version: '1',
            method: 'list_user',
            action: 'find',
            offset: 0,
            limit: 50, // Should be enough (with 1 we can miss if multiple users have a close name)
            query: `"${this.username}"`,
            domain_id: domain_id,
        });

        const data = await this.getResponse(params);

        if (data.total > 0) {
            for (let key in data.user_list) {
                let user = data.user_list[key];
                if (user.name === this.username) {
                    return true;
                }
            }
        }

        return false;
    }

    saveDomain(id, name) {
        this.domain_id = id;
        this.domain_name = name;
        return browser.storage.local.set({
            domain_id: this.domain_id,
            domain_name: this.domain_name
        });
    }

    getSavedDomain() {
        return isEmpty(this.domain_id) ? null : {id: parseInt(this.domain_id), name: this.domain_name};
    }

    saveCookiesOk(ok) {
        this.cookies_ok = ok;
        return browser.storage.local.set({
            cookies_ok: this.cookies_ok,
        });
    }

    async doFetchAliases(offset = 0, aliases = {}) {
        const limit = 50;
        const params = new URLSearchParams({
            api: 'SYNO.MailPlusServer.Alias',
            version: '1',
            method: 'list',
            offset: offset,
            limit: limit,
            action: 'enum',
            domain_id: this.domain_id,
            query: `"${this.username}"`,
            additional: '["member"]'
        });

        const data = await this.getResponse(params);

        for (let key in data.alias_list) {
            let item = data.alias_list[key];
            // Ensure only current user aliases (and if only owned by this user) are displayed (DSM permission allow to see everything)
            if (item.member_list.length === 1 && item.member_list[0].name === this.username) {
                aliases[item.name] = this.getEmailFromAlias(item.name);
            }
        }

        let new_offset = offset + limit;
        if (data.total > new_offset) {
            return this.doFetchAliases(new_offset, aliases);
        }

        return aliases;
    }

    async fetchAliases() {
        this.aliases = await this.doFetchAliases();
        return this.aliases;
    }

    async deleteAlias(alias) {
        const params = new URLSearchParams({
            api: 'SYNO.MailPlusServer.Alias',
            version: '1',
            method: 'delete',
            alias: '["' + alias + '"]',
            domain_id: this.domain_id,
        });

        const data = await this.getResponse(params);

        delete this.aliases[alias];

        this.blockAlias(alias, true); // Safety, we are blocking the alias so the mailserver reject all emails to it.

        if (data !== null) {
            return this.aliases;
        }

        return null;
    }

    async createAlias(alias = '', simple_return = false) {
        if (isEmpty(alias)) {
            alias = this.generateAlias();
        }
        if (isEmpty(this.aliases)) {
            await this.fetchAliases();
        }
        const params = new URLSearchParams({
            stop_when_error: true,
            mode: 'sequential',
            compound: '[{"api":"SYNO.MailPlusServer.Alias","method":"delete_member","version":1,"domain_id":' + this.domain_id + ',"alias_list":[{"member_list":[]}]},{"api":"SYNO.MailPlusServer.Alias","method":"set","version":1,"domain_id":' + this.domain_id + ',"member_list":[{"name":"' + this.username + '","type":0}],"alias":"' + alias + '"}]',
            api: 'SYNO.Entry.Request',
            method: 'request',
            version: '1',
        });

        const data = await this.getResponse(params);

        if (data === null || data.has_fail) {
            return null;
        }

        // Unblock the alias (in case it existed and was deleted before)
        try {
            await this.fetchBlacklist();
            if (!isEmpty(this.blacklist) && !isEmpty(this.blacklist[alias]) && this.blacklist[alias].enabled) {
                await this.blockAlias(alias, false);
            }
        } catch (e) {
            // Blacklist permission is optional, so this can fail silently
        }

        if (simple_return) {
            return this.getEmailFromAlias(alias);
        }

        this.aliases[alias] = this.getEmailFromAlias(alias);

        return {'new': alias, 'aliases': this.aliases};
    }

    async fetchStats() {
        const params = new URLSearchParams({
            api: 'SYNO.MailPlusServer.Statistic',
            version: '3',
            method: 'get_analysis',
            limit: -1,
            offset: 0,
            type: 'receive',
            group_by: 'original_receiver_address',
            keywords: JSON.stringify(Object.values(this.aliases))

        });

        const data = await this.getResponse(params);
        let stats = {};

        if (data.total > 0) {
            data.result_list.forEach((elem) => {
                stats[this.getAliasFromEmail(elem.name)] = elem.count;
            });
        }

        return stats;
    }

    async fetchBlacklist() {
        const params = new URLSearchParams({
            api: 'SYNO.MailPlusServer.Security.BlackwhiteList',
            version: '2',
            method: 'list',
            limit: -1,
            offset: 0,
            action: 'find',
            search_key: 'block-alias-',
            list_type: 'blacklist'
        });

        const data = await this.getResponse(params);
        let blacklist = {};

        if (data.total > 0) {
            data.blackwhite_list.forEach((elem) => {
                blacklist[this.getAliasFromEmail(elem.pattern)] = {id: elem.id, enabled: elem.enable};
            });
        }

        this.blacklist = blacklist;

        return blacklist;
    }

    async blockAlias(alias, blocked) {
        if (this.blacklist === null) {
            return null;
        }
        const params = new URLSearchParams({
            stop_when_error: true,
            mode: 'sequential',
            api: 'SYNO.Entry.Request',
            method: 'request',
            version: '1',
        });
        let email = this.getEmailFromAlias(alias);
        let create = false;

        if (alias in this.blacklist) {
            if (this.blacklist[alias].enable === blocked) {
                return this.blacklist; // Already in the wanted state, do nothing
            }

            // Just change enabled to true
            params.append('compound', '[{"api":"SYNO.MailPlusServer.Security.BlackwhiteList","method":"set","version":2,"list_type":"blacklist","edit_list":[{"id":' + this.blacklist[alias].id + ',"enable":' + blocked + ',"description":"block-alias-' + alias + '","pattern":"' + email + '","type":"recipient","action":"reject"}]}]');
        } else {
            // Need to create a new blacklist entry
            create = true;
            params.append('compound', '[{"api":"SYNO.MailPlusServer.Security.BlackwhiteList","method":"create","version":2,"list_type":"blacklist","item_list":[{"id":-1,"enable":' + blocked + ',"description":"block-alias-' + alias + '","pattern":"' + email + '","type":"recipient","action":"reject"}]}]');
        }

        const data = await this.getResponse(params);

        if (data !== null && !data.has_fail) {
            // Create = new id, we need to fetch it
            if (create) {
                return await this.fetchBlacklist();
            }
            return this.blacklist;
        }

        return null;
    }

    generateAlias(length = 5) {
        var result = '';
        var characters = 'abcdefghijklmnopqrstuvwxyz';
        var charactersLength = characters.length;
        for (var i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        return result;
    }

    getAliasFromEmail(email) {
        return email.replace('@' + this.domain_name, '');
    }

    getEmailFromAlias(alias) {
        return alias + '@' + this.domain_name;
    }
}