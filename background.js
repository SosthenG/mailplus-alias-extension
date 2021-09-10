import { Client, confStatuses, isEmpty } from './client.js';

const client = new Client();

browser.contextMenus.create({
    id: "generate-new-alias",
    title: 'Generate new MailPlus alias',
    contexts: ["editable"],
    onclick(info, tab) {
        client.loadSavedConf().then((status) => {
            if (status === confStatuses.OK) {
                client.createAlias().then((result) => {
                    if (isEmpty(result) || isEmpty(result.new)) {
                        console.error('Failed to create new alias.');
                    } else {
                        let email = result.aliases[result.new];
                        browser.tabs.executeScript(tab.id, {
                            frameId: info.frameId,
                            code: `browser.menus.getTargetElement(${info.targetElementId}).value = "${email}";`,
                        });
                    }
                });
            } else {
                console.error('Please configure the extension before using this menu.');
            }
        });
    },
});
