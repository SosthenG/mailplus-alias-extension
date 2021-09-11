# MailPlus Alias Extension

:warning: This project is still in development. I built it for my own needs, so it might not suit yours. However, feel free to open an issue or contribute if you find a bug or want to improve this
extension.

## Features

This extension allows you to create email aliases for your [Synology MailPlus](https://www.synology.com/fr-fr/dsm/feature/mailplus) account directly from your browser. Idea is the same
as [Firefox Relay](https://relay.firefox.com/) but with your own server, own domain and with no limitation because you can create as much alias as you want for your MailPlus account.

![demo](demo.png)

### Context menu

You can create a random alias in any input field from the context menu. Just right click on a field and select "Generate new MailPlus alias", the field will then be filled with it.

### Forward/block

By default, all created aliases are enabled and will forward to your default MailPlus email address. You can block an alias by clicking the switch.

When blocked, the mail server will reject every email sent to the alias. Just click again to reactivate forwarding.

When deleted, an alias is automatically blocked. This is a safety mesure in case the mail server is configured to forward any inexistant address. If you create an alias with the same name later, it
will be unblocked.

You can see the number of forwarded emails for a given alias just next to it.

## Target

This extension can only be used by people using [Synology MailPlus Server](https://www.synology.com/fr-fr/dsm/feature/mailplus). Please also note that your DSM account need to have the "MailPlus
Server" permission. This will not work with the "MailPlus" permission as alias creation is made on the server side.

:warning: Accounts with this permission will have access to the entire configuration of your email server, so it should only be given to the server administrator.

This extension has only been tested with Firefox 91.0.2 yet, so it might not work with others versions and probably will not with other browser. Support to more browsers might be added later.

## Build

Run `./build.sh` (linux) inside the project directory. This build script only require the `zip` package to be installed on your system, otherwise you will have to zip the built folder yourself.