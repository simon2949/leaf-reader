const path=require('node:path'),fs=require('node:fs');
fs.mkdirSync(path.resolve(__dirname,'../outputs'),{recursive:true});
const sdk=process.env.ANDROID_HOME||process.env.ANDROID_SDK_ROOT;
module.exports={
 ...require(process.env.PLAYWRIGHT_MODULE||'playwright'),
 chromePath:process.env.CHROME_PATH||undefined,
 adbPath:process.env.ADB_PATH||(sdk?path.join(sdk,'platform-tools',process.platform==='win32'?'adb.exe':'adb'):'adb'),
 baseURL:process.env.LEAF_TEST_URL||'http://127.0.0.1:4173',
};
