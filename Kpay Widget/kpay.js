var common = importModule('./utils/common.js');
var data = importModule('./utils/data.js');

module.exports.KpayMerchantApi = (apiKey) => {
  return new KpayMerchantApi(apiKey);
}

class KpayMerchantApi {

  constructor(apiKey) {
    this._apiKey = apiKey;

    this._apiData = data.KpayMerchantApiData(this._loadFromStorage, this._storeInStorage);

    // do NOT change this or Kristof will be angry and your API key may also get blocked for a period of time
    this._apiData.setMaximumAge(15 * 60 * 1000); // 15 Minutes in milli seconds
  }

  async fetchSummary() {
    return await this._fetchData(common.SUMMARY);
  }

  async fetchToday() {
    return await this._fetchData(common.TODAY);
  }

  async fetchYesterday() {
    return await this._fetchData(common.YESTERDAY);
  }

  async fetchHistory() {
    return await this._fetchData(common.HISTORY);
  }

  _loadFromStorage() {
    try {
      var fm = FileManager.iCloud();
      let dir = fm.documentsDirectory();
      var path = fm.joinPath(dir, "Kpay Widget/data/");

      if (!fm.fileExists(path + common.STORED_DATA_FILE)) {
        return {};
      }

      let dataAsString = fm.readString(path + common.STORED_DATA_FILE);
      if (dataAsString) {
        return JSON.parse(dataAsString);
      }
    } catch (e) {
      console.log(e);
      return {};
    }
  }

  _storeInStorage(data) {
    try {
      var fm = FileManager.iCloud();
      let dir = fm.documentsDirectory();
      var path = fm.joinPath(dir, "Kpay Widget/data/");

      if (!fm.fileExists(path)) {
        fm.createDirectory(path, false);
      }
      fm.writeString(path + common.STORED_DATA_FILE, JSON.stringify(data));
    } catch (e) {
      console.log(e);
    }
  }

  async _fetchData(dataType) {
    dataType = this._apiData.toArray(dataType);
    let isOutOfDate = this._apiData.outOfDate(dataType);

    if (isOutOfDate) {
      // get fresh data
      await this._fetchDataRemote(dataType);
    }
    return this._apiData.get(dataType);
  }

  async _fetchDataRemote(dataType) {
    if (!this._apiKey) {
      console.log("ERROR: KPay Merchant API apikey not set! Cannot fetch data without valid apikey!");
      return;
    }
    if (this._apiKey == common.TEST_API_KEY) {
      console.log("WARNING: test api key with random data is used, replace with your own api key for real data!");
    }

    //get data
    try {
      var data = await new Request(this._getUrl(dataType)).loadJSON();

      if (dataType === common.SUMMARY) {
        data = JSON.parse(JSON.stringify(data).replace(/null/g, "0")); // seems to fix the null crash
      }

      //received some data
      console.log(`KPay Merchant API '${dataType}' data received: ${JSON.stringify(data)}`);

      //store new data
      this._apiData.set(dataType, data);
    } catch (error) {
      //error getting data
      console.log(`Error getting KPay Merchant API '${dataType}' data: ${error}`);
    }
  }

  _getUrl(dataType) {
    if (dataType == common.SUMMARY) {
      return 'https://api.kiezelpay.com/api/merchant/summary?key=' + this._apiKey;
    } else if (dataType == common.TODAY) {
      return 'https://api.kiezelpay.com/api/merchant/today?key=' + this._apiKey + '&offset=' + (new Date()).getTimezoneOffset();
    } else if (dataType == common.YESTERDAY) {
      return 'https://api.kiezelpay.com/api/merchant/yesterday?key=' + this._apiKey + '&offset=' + (new Date()).getTimezoneOffset();
    } else if (dataType == common.HISTORY) {
      return 'https://api.kiezelpay.com/api/merchant/history?key=' + this._apiKey + '&amount=7' + '&sort=desc';
    } else {
      throw `ERROR: unknown data type '${dataType}'. Fetching data not possible as url is unknown.`;
    }
  }
};
