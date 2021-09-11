import {Client, isEmpty} from './client.js';

const client = new Client();

browser.contextMenus.create({
    id: "generate-new-alias",
    title: 'Generate new MailPlus alias',
    contexts: ["editable"],
    onclick(info, tab) {
        client.loadSavedConf().then((ok) => {
            if (ok) {
                browser.tabs.executeScript(tab.id, {
                    frameId: info.frameId,
                    code: `let elem = browser.menus.getTargetElement(${info.targetElementId}); elem.value = "Generating alias..."; elem.disabled = true;`,
                });
                client.createAlias('', true).then((email) => {
                    if (isEmpty(email)) {
                        browser.tabs.executeScript(tab.id, {
                            frameId: info.frameId,
                            code: `elem.disabled = false; elem.value = ""; alert("Failed to generate MailPlus alias!")`,
                        });
                    } else {
                        browser.tabs.executeScript(tab.id, {
                            frameId: info.frameId,
                            code: `elem.disabled = false; elem.value ="${email}";`,
                        });
                    }
                });
            } else {
                console.error('Please configure the extension before using this menu.');
            }
        });
    },
});
