var common = importModule('./utils/common.js');

module.exports.KpayWidget = (kpayApi) => {
  return new KpayWidget(kpayApi);
}

class KpayWidget {

  constructor(kpayApi) {
    this._kpayApi = kpayApi;

    // import previous preferences
    this._prefs = importModule('./Kpay Widget/utils/preferences.js').Preferences();
    this._prefs.load();

    // check saved values and set initial empty states
    this._currentDate = new Date().getDate();
    if (this._prefs.getItem("dateSave") === undefined) {
      this._prefs.setItem("dateSave", this._currentDate);
    }

    this._kpayTodayAmountSave = this._prefs.getItem("salesSave");
    if (this._kpayTodayAmountSave === undefined) {
      this._prefs.setItem("salesSave", 0);
      this._kpayTodayAmountSave = 0;
    }

    if (this._prefs.getItem("salesChangeSave") === undefined) {
      this._prefs.setItem("salesChangeSave", 0);
    }
  }

  async init() {
    // load data
    let kpayToday = await this._kpayApi.fetchToday();
    let kpaySummary = await this._kpayApi.fetchSummary();
    let kpayYesterday = await this._kpayApi.fetchYesterday();
    let kpayHistory = await this._kpayApi.fetchHistory();

    // build widget 
    this._widget = new ListWidget();
    this._widget.backgroundColor = Color.black();
    await this._buildWidget(this._widget, kpayToday[common.TODAY], kpaySummary[common.SUMMARY], kpayYesterday[common.YESTERDAY], kpayHistory[common.HISTORY]);
  }

  async _buildWidget(widget, kpayToday, kpaySummary, kpayYesterday, kpayHistory) {
    ///////////////////////////
    // variables
    ///////////////////////////

    var todayRank = 0;
    var todayPurchases = 0;
    var todayAverageSalePrice = 0;
    var roundedValue = 0;
    var roundedValueAccurate = 0;
    var salesChange = "";
    var todaySales = 0;
    var lastRefreshTime = "";

    var thisMonthSales = 0;
    var lastMonthSales = 0;

    var yesterdaySales = 0;
    var yesterdayRankSalesAverage = 0;

    let lastSaleTime = "";

    let soldProducts = "";

    ///////////////////////////
    // set variables values
    ///////////////////////////

    ///////////////////////////
    // TODAY
    ///////////////////////////
    if (kpayToday !== undefined && kpayToday.rank !== undefined) {
      todayRank = kpayToday.rank;
      todayPurchases = kpayToday.purchases;
      todayAverageSalePrice = ((kpayToday.amount / kpayToday.purchases || 0).toFixed(1));

      // find any sales increases and round them to two decimals
      roundedValue = Math.round(kpayToday.amount - this._kpayTodayAmountSave);
      roundedValueAccurate = this._formatNumber((Math.round((kpayToday.amount - this._kpayTodayAmountSave) * 100) / 100));

      salesChange = "";
      this._kpayTodayAmountSave = kpayToday.amount || 0;
      todaySales = this._formatNumber(kpayToday.amount) || 0;

      // check to see if sales have changed since last widget refresh
      if (this._prefs.getItem("dateSave") === this._currentDate) {
        if (roundedValue > 0) {
          // show new change value and save the change
          this._prefs.setItem("salesChangeSave", roundedValueAccurate);
          salesChange = "+" + roundedValueAccurate;
        } else if (roundedValue == 0 && this._prefs.getItem("salesChangeSave") > 0) {
          // preserve change value and show the old one
          salesChange = "+" + this._prefs.getItem("salesChangeSave");
        }
      }
      if (roundedValue < 0) {
        // reset value
        this._prefs.setItem("salesChangeSave", 0);
      }

      let kpayTodayDate = new Date(kpayToday.timestamp);
      lastRefreshTime = common.zeroPad(kpayTodayDate.getHours()) + ":" + common.zeroPad(kpayTodayDate.getMinutes());
    }

    ///////////////////////////
    // SUMMARY
    ///////////////////////////
    if (kpaySummary !== undefined) {
      // detect if it's before or after the cut off or payout dates and calcute the correct amount
      if (kpaySummary.nextPayout.amount === kpaySummary.currentBalance && kpaySummary.previousPayout.amount != undefined) {
        thisMonthSales = this._formatNumber(kpaySummary.nextPayout.amount);
        lastMonthSales = this._formatNumber(kpaySummary.previousPayout.amount);
      } else {
        thisMonthSales = this._formatNumber((Math.round((kpaySummary.currentBalance - kpaySummary.nextPayout.amount) * 100) / 100));
        lastMonthSales = this._formatNumber(kpaySummary.nextPayout.amount);
      }
    }

    ///////////////////////////
    // YESTERDAY
    ///////////////////////////
    if (kpayYesterday !== undefined) {
      yesterdaySales = this._formatNumber(kpayYesterday.amount) || 0;
      yesterdayRankSalesAverage = kpayYesterday.rank + " · " + kpayYesterday.purchases + " · " + "$" + (kpayYesterday.amount / kpayYesterday.purchases || 0).toFixed(1);
    }

    ///////////////////////////
    // HISTORY
    ///////////////////////////
    if (kpayHistory !== undefined && kpayHistory.purchases.length > 0) {
      // last sale time in format "2021-12-21 08:35:52"
      // make sale time format Date.parse compatile: "2021-12-21T08:35:52"
      let lastSaleTimeData = kpayHistory.purchases[0].paidDate.replace(" ", 'T');
      let lastSaleTimeDate = new Date(lastSaleTimeData);
      lastSaleTime = common.zeroPad(lastSaleTimeDate.getHours()) + ":" + common.zeroPad(lastSaleTimeDate.getMinutes());

      kpayHistory.purchases.forEach(
        (purchase) => {
          let sold = "";

          if (purchase.bundleTriggeredBy !== null && purchase.bundleTriggeredBy !== undefined && purchase.bundleTriggeredBy !== "") {
            sold = purchase.product + " (" + purchase.bundleTriggeredBy + ")";
          } else {
            sold = purchase.product;
          }

          if (soldProducts == "") {
            soldProducts = sold;
          } else {
            soldProducts += " · " + sold;
          }
        });
    }

    ///////////////////////////
    // generate gui elements
    ///////////////////////////

    var mainStack = widget.addStack();
    mainStack.layoutHorizontally();
    mainStack.topAlignContent();

    ///////////////////////////
    // gui: column 0
    ///////////////////////////

    var column0 = mainStack.addStack();
    column0.layoutVertically();

    // logo
    let fm = FileManager.iCloud();
    let dir = fm.documentsDirectory();
    let path = fm.joinPath(dir, "Kpay Widget/data/");
    let logo = await fm.readImage(path + "logo.png");

    let logoStack = column0.addStack();
    let logoImage = logoStack.addImage(logo);
    // force logo image size 
    logoImage.imageSize = new Size(65, 65);

    column0.addSpacer();

    // last refresh and last sale
    let lastSaleStack = column0.addStack();
    lastSaleStack.layoutHorizontally();

    if (lastSaleTime !== "") {
      this._addSymbol(lastSaleStack, "cart", Font.body(), Color.white(), 16, 3);
      this._addText(lastSaleStack, lastSaleTime, Font.footnote());
    }

    column0.addSpacer(8);

    let lastUpdateStack = column0.addStack();
    lastSaleStack.layoutHorizontally();
    lastSaleStack.bottomAlignContent();

    this._addSymbol(lastUpdateStack, "arrow.clockwise.icloud", Font.body(), Color.white(), 16, 3);
    this._addText(lastUpdateStack, lastRefreshTime, Font.footnote());

    column0.addSpacer(2);

    mainStack.addSpacer(15);

    ///////////////////////////
    // gui: column 1
    ///////////////////////////

    var column1 = mainStack.addStack();
    column1.layoutVertically();

    // first line: sales, change in sales
    let salesStack = column1.addStack();
    salesStack.layoutHorizontally();
    salesStack.bottomAlignContent();

    this._addSymbol(salesStack, "creditcard", Font.body(), Color.white(), 22, 6);
    this._addText(salesStack, "$" + todaySales, Font.body(), 10);
    if (salesChange !== "") {
      this._addText(salesStack, salesChange, Font.body(), 0, new Color("#00fd00"));
    }
    salesStack.addSpacer();
    this._addText(salesStack, "$" + yesterdaySales, Font.footnote(), 0, new Color("#afafaf"));

    column1.addSpacer(2);

    // second line: rank, sales today, avg. price
    let rankStack = column1.addStack();
    rankStack.layoutHorizontally();
    rankStack.bottomAlignContent();

    this._addSymbol(rankStack, "flag", Font.body(), Color.white(), 22, 6);
    this._addText(rankStack, todayRank + " · " + todayPurchases + " · " + "$" + todayAverageSalePrice, Font.body());
    rankStack.addSpacer();
    this._addText(rankStack, yesterdayRankSalesAverage, Font.footnote(), 0, new Color("#afafaf"));

    column1.addSpacer(2);

    // third line: payout
    let payoutStack = column1.addStack();
    payoutStack.layoutHorizontally();
    payoutStack.bottomAlignContent();

    this._addSymbol(payoutStack, "calendar", Font.body(), Color.white(), 22, 6);
    this._addText(payoutStack, "$" + thisMonthSales, Font.body());
    payoutStack.addSpacer();
    this._addText(payoutStack, "$" + lastMonthSales, Font.footnote(), 0, new Color("#afafaf"));

    column1.addSpacer(14);

    // fourth line: sold products
    let soldProductsStack = column1.addStack();
    soldProductsStack.layoutHorizontally();
    soldProductsStack.bottomAlignContent();

    let soldProductsText = this._addText(soldProductsStack, soldProducts, Font.footnote(), 0, new Color("#afafaf"));
    soldProductsText.lineLimit = 3;
    soldProductsText.minimumScaleFactor = 0.8;
  }

  _addSymbol(stack, name, font, color, size, space) {
    let symbol = SFSymbol.named(name);
    symbol.applyFont(font);

    let symbolImage = stack.addImage(symbol.image);
    symbolImage.tintColor = color;
    symbolImage.imageSize = new Size(size, size);

    if (space || space > 0) {
      stack.addSpacer(space);
    }
  }

  _addText(stack, text, textFont, space, color) {
    let widgetText = stack.addText("" + text);
    widgetText.font = textFont;

    if (space || space > 0) {
      stack.addSpacer(space);
    }
    if (color !== undefined) {
      widgetText.textColor = color;
    } else {
      widgetText.textColor = Color.white();
    }

    return widgetText;
  }

  _formatNumber(inputNumber) {
    return inputNumber.toLocaleString();
  }

  async showWidget() {
    // set or show the widget 
    if (!config.runsInWidget) {
      await this._widget.presentMedium();
    } else {
      Script.setWidget(this._widget);
    }
  }

  async savePreferences() {
    // save current data for comparison
    this._prefs.setItem("dateSave", this._currentDate);
    this._prefs.setItem("salesSave", this._kpayTodayAmountSave);
    await this._prefs.save();
  }
}
