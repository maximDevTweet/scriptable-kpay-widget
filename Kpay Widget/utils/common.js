module.exports.TEST_API_KEY = "0123456789abcdef0123456789abcdef";

module.exports.STORED_DATA_FILE = "data.json";
module.exports.STORED_PREFERENCES_FILE = "preferences.json";

module.exports.SUMMARY = "summary";
module.exports.TODAY = "today";
module.exports.YESTERDAY = "yesterday";
module.exports.HISTORY = "history";

module.exports.zeroPad = (n) => {
  if (n < 10) {
    n = "0" + n;
  }
  return n;
}
