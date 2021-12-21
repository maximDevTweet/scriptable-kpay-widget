// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: teal; icon-glyph: donate;
// Based on renos kStats project: https://github.com/john-reno/kStats
// Widget to show your Kiezelpay statistics

var common = importModule('./Kpay Widget/utils/common.js');

// replace with your Kpay Api Key:
const KPAY_API_KEY = common.TEST_API_KEY;

// create an api object 
var kpayApi = importModule('./Kpay Widget/kpay.js').KpayMerchantApi(KPAY_API_KEY);

// create a widget object
var kpayWidget = importModule('./Kpay Widget/widget.js').KpayWidget(kpayApi);

// init widget data and elements
await kpayWidget.init();

// set widget visible
await kpayWidget.showWidget();

// save prefs
await kpayWidget.savePreferences();

// complete script
Script.complete();
