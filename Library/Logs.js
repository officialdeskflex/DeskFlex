let logsList = [];

function logs(message = "", type = "log", source = "") {
    const now = new Date();
    const time = now.toTimeString().split(" ")[0] + '.' + now.getMilliseconds().toString().padStart(3, '0');

    const safeType = (type || "log").toUpperCase();  
    const safeSource = source ? ` ${source}:` : "";  
    const safeMessage = message || "";               

    const formatted = `${safeType} (${time})${safeSource} ${safeMessage}`;
    logsList.push(formatted);

    switch (safeType.toLowerCase()) {
        case "error": console.error(formatted); break;
        case "info": console.info(formatted); break;
        case "warn": console.warn(formatted); break;
        case "debug": console.debug(formatted); break;
        default: console.log(formatted); break;
    }
}

function getLogs() {
    return logsList;
}

module.exports = {logs,getLogs};
