window.conf = {};

conf.checkCallBack = function() {
this.loadConfigCount--;
if (this.loadConfigCount <= 0) if (null != this.callback) {
this.callback();
this.callback = null;
} else cc.error("加载配置表错误！！！ 请检查 loadConfigCount = " + this.loadConfigCount);
};

conf.loadConfig = function(e) {
if (1 != this.isLoadedConfig) {
this.callback = e;
this.loadConfigCount = 0;
this.isLoadedConfig = 1;
this.loadConfigCount++;
cc.loader.loadRes("config/stage_cfg", function(e, a) {
conf.stage_cfg = a.json;
conf.checkCallBack();
});
this.loadConfigCount++;
cc.loader.loadRes("config/levels", function(e, a) {
var o = {};
a = a.json;
for (var l in a) {
var n = a[l];
o[n.wordId] || (o[n.wordId] = {});
o[n.wordId][n.levelId] = n;
}
conf.stage_level_cfg = o;
conf.level_cfg = a;
conf.checkCallBack();
});
this.loadConfigCount++;
cc.loader.loadRes("config/theme", function(e, a) {
conf.theme_cfg = a.json;
conf.checkCallBack();
});
this.loadConfigCount++;
cc.loader.loadRes("config/game_lang", function(e, a) {
window.i18n || (window.i18n = {});
window.i18n.languages || (window.i18n.languages = {});
a = a.json;
for (var o in a) for (var l in a[o]) if ("" != l && "id" != l && "sz_key" != l) {
var n = l.substring(3);
window.i18n.languages[n] || (window.i18n.languages[n] = {});
window.i18n.languages[n][a[o].sz_key] = a[o][l].replace(/\\n/g, "\n");
}
conf.checkCallBack();
});
this.loadConfigCount++;
cc.loader.loadRes("config/worlds", function(e, a) {
conf.worlds = a.json;
conf.checkCallBack();
});
this.loadConfigCount++;
cc.loader.loadRes("config/quest", function(e, a) {
conf.quest_cfg = a.json;
conf.checkCallBack();
});
this.loadConfigCount++;
cc.loader.loadRes("config/face", function(e, a) {
conf.face_cfg = a.json;
conf.checkCallBack();
});
this.loadConfigCount++;
conf.all_Level = {};
cc.loader.loadResDir("Puzzle/", function(e, a) {
if (!e) for (var o = 0; o < a.length; o++) for (var l = a[o].text.split("\n"), n = 0, c = 0; c < l.length; c++) if ("" != l[c] && "\r" != l[c]) if ("#" == l[c].substring(0, 1)) {
n = parseInt(l[c].substring(1, l[c].length - 1));
conf.all_Level[n] = [];
} else {
var i = l[c].split(",");
for (var t in i) {
var f = i[t].replace(/\r/g, "");
switch (f.toUpperCase()) {
case "0":
f = tileType.kTileDataSpace;
break;

case "C":
f = tileType.kTileDataHead;
break;

case "P":
f = tileType.kTileDataPortal;
break;

case "^":
f = tileType.kTileDataArrowUp;
break;

case ">":
f = tileType.kTileDataArrowRight;
break;

case "<":
f = tileType.kTileDataArrowLeft;
break;

case "V":
f = tileType.kTileDataArrowDown;
break;

case "W":
f = tileType.kTileDataBlock;
break;

case "B":
f = tileType.kTileDataDestroyable;
break;

case "K":
f = tileType.kTileDataKey;
break;

case "L":
f = tileType.kTileDataLock;
}
i[t] = f;
}
conf.all_Level[n][conf.all_Level[n].length] = i;
}
conf.checkCallBack();
});
} else null != e && e();
};