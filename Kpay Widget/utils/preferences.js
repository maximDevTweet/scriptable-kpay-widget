const common = importModule('./common.js');

module.exports.Preferences = () => {
  return new Preferences();
}

class Preferences {
  constructor() {
    this._map = {};
    this.load();
  }

  setItem(key, value) {
    this._map[key] = value;
  }

  getItem(key, value) {
    let v = this._map[key];
    return v === undefined ? value : v;
  }

  load() {
    try {
      var fm = FileManager.iCloud();
      let dir = fm.documentsDirectory();
      var path = fm.joinPath(dir, "Kpay Widget/data/");

      if (!fm.fileExists(path + common.STORED_PREFERENCES_FILE)) {
        return false;
      }

      let dataAsString = fm.readString(path + common.STORED_PREFERENCES_FILE);
      if (dataAsString) {
        this._map = JSON.parse(dataAsString);
        return true;
      }
    } catch (e) {
      console.log(e);
      this._map = {};
      return false;
    }
  }

  save() {
    try {
      var fm = FileManager.iCloud();
      let dir = fm.documentsDirectory();
      var path = fm.joinPath(dir, "Kpay Widget/data/");

      if (!fm.fileExists(path)) {
        fm.createDirectory(path, false);
      }
      fm.writeString(path + common.STORED_PREFERENCES_FILE, JSON.stringify(this._map));
      return true;
    } catch (e) {
      console.log(e);
      return false;
    }
  }
}
