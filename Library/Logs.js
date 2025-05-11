const fs = require("fs");
const path = require("path");
const { getLogging } = require("./ConfigFile");

const logsList = [];

function logs(message = "", type = "info", source = "") {
  const now = new Date();
  const time =
    now.toTimeString().split(" ")[0] +
    "." +
    now.getMilliseconds().toString().padStart(3, "0");
  const safeType = (type || "log").toUpperCase();
  const safeSource = source ? ` ${source}:` : "";
  const safeMessage = message || "";
  const formatted = `${safeType} (${time})${safeSource} ${safeMessage}`;
  logsList.push(formatted);

  switch (safeType.toLowerCase()) {
    case "error":
      console.error(formatted);
      break;
    case "info":
      console.info(formatted);
      break;
    case "warn":
      console.warn(formatted);
      break;
    case "debug":
      console.debug(formatted);
      break;
    default:
      console.log(formatted);
      break;
  }
  if (getLogging() > 0) {
    saveToFileLog(formatted);
  }
}

function getLogs() {
  return logsList;
}

function saveToFileLog(logEntry) {
  const filePath = path.join(process.env.APPDATA, "DeskFlex", "DeskFlex.log");
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const existing = fs.existsSync(filePath)
    ? fs.readFileSync(filePath, "utf8")
    : "";
  fs.writeFileSync(filePath, logEntry + "\n" + existing, "utf8");
}

function clearAllLogs() {
  const filePath = path.join(process.env.APPDATA, "DeskFlex", "DeskFlex.log");
  const dir = path.dirname(filePath);

  logsList.length = 0;

  if (fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, "", "utf8");
  }
}

module.exports = { logs, getLogs, saveToFileLog, clearAllLogs };