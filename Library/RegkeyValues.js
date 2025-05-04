const Winreg = require('winreg');

function getDeskFlexValue(valueName) {
  const keysToTry = [
    new Winreg({ hive: Winreg.HKLM, key: '\\SOFTWARE\\DeskFlex' }),
    new Winreg({ hive: Winreg.HKLM, key: '\\SOFTWARE\\Wow6432Node\\DeskFlex' })
  ];

  return new Promise((resolve, reject) => {
    function tryNext(index) {
      if (index >= keysToTry.length) {
        reject(new Error(`"${valueName}" not found in registry`));
        return;
      }

      keysToTry[index].values((err, items) => {
        if (err) {
          tryNext(index + 1);
          return;
        }

        const targetItem = items.find(item => item.name === valueName);
        if (targetItem) {
          resolve(targetItem.value);
        } else {
          tryNext(index + 1);
        }
      });
    }

    tryNext(0);
  });
}

function getDeskFlexVersion() {return getDeskFlexValue('Version');}
function getDeskFlexLang() {return getDeskFlexValue('lang');}

module.exports = {getDeskFlexValue,getDeskFlexVersion,getDeskFlexLang};
