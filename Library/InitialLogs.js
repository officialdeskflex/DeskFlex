const { logs } = require('./Logs');
const { getDeskFlexVersion, getDeskFlexLang } = require('./RegkeyValues');
const { getConfigEditorPath, getDarkMode, getFlexesPath } = require('./ConfigFile');

async function runDeskFlexInfo() {
    try {
        const version = await getDeskFlexVersion();
        const lang = await getDeskFlexLang();
        
        logs(`DeskFlex Version: ${version}`, "Info", "DeskFlex");
        logs(`DeskFlex Language: ${lang}`, "Info", "DeskFlex");
    } catch (err) {
        logs(`Error fetching DeskFlex info: ${err.message}`, "Error", "DeskFlex");
    }

    logs(`Config Editor Path: ${getConfigEditorPath()}`, "Info", "DeskFlex");
    logs(`Dark Mode: ${getDarkMode() ? 'Enabled' : 'Disabled'}`, "Info", "DeskFlex");
    logs(`Widgets Path: ${getFlexesPath()}`, "Info", "DeskFlex");
}

module.exports = { runDeskFlexInfo };