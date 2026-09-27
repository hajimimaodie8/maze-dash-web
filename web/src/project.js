window.__require = function e(t, i, n) {
function a(c, l) {
if (!i[c]) {
if (!t[c]) {
var s = c.split("/");
s = s[s.length - 1];
if (!t[s]) {
var r = "function" == typeof __require && __require;
if (!l && r) return r(s, !0);
if (o) return o(s, !0);
throw new Error("Cannot find module '" + c + "'");
}
}
var h = i[c] = {
exports: {}
};
t[c][0].call(h.exports, function(e) {
return a(t[c][1][e] || e);
}, h, h.exports, e, t, i, n);
}
return i[c].exports;
}
for (var o = "function" == typeof __require && __require, c = 0; c < n.length; c++) a(n[c]);
return a;
}({
Aboutus: [ function(e, t, i) {
"use strict";
cc._RF.push(t, "7dc5eUmgohNGbuL3YWIrL9X", "Aboutus");
cc.Class({
extends: cc.Component,
properties: {
deleteData: {
default: null,
type: cc.Node
},
collectData: {
default: null,
type: cc.Node
},
DontCollectDataPerfab: {
default: null,
type: cc.Prefab
},
modalBoxPerfab: {
default: null,
type: cc.Prefab
}
},
start: function() {
if (gamemain.checkIsGDPREnforcedCountry()) {
this.deleteData.active = !0;
this.collectData.active = !0;
} else {
this.deleteData.active = !1;
this.collectData.active = !1;
}
},
clickTermsOfService: function() {
cc.sys.openURL("http://www.cmcm.com/protocol/site/tos.html");
},
clickPrivacyPolicy: function() {
cc.sys.openURL("http://www.cmcm.com/protocol/site/privacy.html");
},
clickADChoices: function() {
cc.sys.openURL("http://www.cmcm.com/protocol/site/ad-choice.html");
},
clickDeleteMyData: function() {
cc.sys.openURL("http://www.cmcm.com/en-us/opt-out/index.html");
},
clickDontCollectData: function() {
var e = cc.instantiate(this.DontCollectDataPerfab), t = e.getComponent("MoveNode");
t && t.play();
var i = gamemain.getRunningScene();
gamemain.showWnd(i, e, {
havelistener: 1
}, this.modalBoxPerfab);
}
});
cc._RF.pop();
}, {} ],
AnimScene: [ function(e, t, i) {
"use strict";
cc._RF.push(t, "2b8f1oHxFNBgKAwiqNSbb6J", "AnimScene");
cc.Class({
extends: cc.Component,
properties: {
beginAnimation: {
default: null,
type: cc.Animation,
tooltip: "开头动画"
},
TitleEn: {
default: null,
type: cc.Node,
tooltip: "英语标题"
},
TitleFT: {
default: null,
type: cc.Node,
tooltip: "繁体标题"
},
TitleJT: {
default: null,
type: cc.Node,
tooltip: "简体标题"
},
TitleJp: {
default: null,
type: cc.Node,
tooltip: "日语标题"
},
bgm_trailer: {
default: null,
type: cc.AudioClip,
tooltip: "bgm_trailer"
},
bgm_gply: {
default: null,
type: cc.AudioClip,
tooltip: "bgm_gply"
},
sfx_laun_brick_show: {
default: null,
type: cc.AudioClip,
tooltip: "sfx_laun_brick_show"
},
sfx_laun_snake_move: {
default: null,
type: cc.AudioClip,
tooltip: "sfx_laun_snake_move"
},
sfx_laun_brick_break: {
default: null,
type: cc.AudioClip,
tooltip: "sfx_laun_brick_break"
}
},
onLoad: function() {
var t = new Date(), i = t.getFullYear() + "" + (t.getMonth() + 1) + t.getDate(), n = getLocalStorage("login_history");
n = n ? JSON.parse(n) : [];
setLocalStorage("can_get_free_infinity_ticket", 0);
if (!isInArray(n, i)) {
n.push(i);
setLocalStorage("login_history", JSON.stringify(n));
setLocalStorage("can_get_free_infinity_ticket", 1);
}
var a = this;
conf.loadConfig(function() {
window.i18nPlug || (window.i18nPlug = e("LanguageData"));
i18nPlug.init(gamemain.getGameLang());
gamemain.getPassInfo();
gamemain.getFaceInfo();
gamemain.popViewCount = 0;
gamemain.setBackGroupSound();
gamemain.setEffectSoundSound();
a.showAction();
});
},
start: function() {},
showAction: function() {
var e = gamemain.getGameLang();
this.hideAllTitle();
"zh-Hant" == e ? this.TitleFT.active = !0 : "zh-Hans" == e ? this.TitleJT.active = !0 : "ja" == e ? this.TitleJp.active = !0 : this.TitleEn.active = !0;
this.beginAnimation && this.beginAnimation.play();
},
actionStart: function() {
gamemain.playEffect(this.sfx_laun_brick_show);
},
snakeMove: function() {
gamemain.playEffect(this.sfx_laun_snake_move);
},
hideAllTitle: function() {
this.TitleEn.active = !1;
this.TitleFT.active = !1;
this.TitleJT.active = !1;
this.TitleJp.active = !1;
},
strike: function() {
gamemain.playEffect(this.sfx_laun_brick_break);
},
actionEnd: function() {
cc.audioEngine.playMusic(this.bgm_trailer, !0);
cc.audioEngine.playMusic(this.bgm_trailer, !0);
gamemain.getQuestInfo();
gamemain.enterHallScene();
}
});
cc._RF.pop();
}, {
LanguageData: "LanguageData"
} ],
CustomScrollView: [ function(e, t, i) {
"use strict";
cc._RF.push(t, "5347ePJvGhN0aiikPziS/HV", "CustomScrollView");
cc.Class({
extends: cc.ScrollView,
properties: {},
onTouchStart: function(e) {
e.stopPropagation();
},
onLoad: function() {
this.node.on(cc.Node.EventType.TOUCH_START, this.onTouchStart, this);
this.node.on(cc.Node.EventType.TOUCH_MOVE, this.onTouchStart, this);
},
start: function() {},
onDestroy: function() {
this.node.off(cc.Node.EventType.TOUCH_START, this.onTouchStart, this);
this.node.off(cc.Node.EventType.TOUCH_MOVE, this.onTouchStart, this);
}
});
cc._RF.pop();
}, {} ],
DontCollectData: [ function(e, t, i) {
"use strict";
cc._RF.push(t, "325d2UZZltBdLMG6sUKBjSa", "DontCollectData");
cc.Class({
extends: cc.Component,
properties: {
sfx_tran_popup_hide: {
default: null,
type: cc.AudioClip,
tooltip: "sfx_tran_popup_hide"
},
sfx_ui_general_button: {
default: null,
type: cc.AudioClip,
tooltip: "sfx_ui_general_button"
}
},
start: function() {},
clickRestart: function() {
gamemain.closeMenuItemAndBg(this.node, null, null, !0, this.sfx_tran_popup_hide, this.sfx_ui_general_button);
},
clickCancel: function() {
gamemain.closeMenuItemAndBg(this.node, null, null, null, this.sfx_tran_popup_hide, this.sfx_ui_general_button);
}
});
cc._RF.pop();
}, {} ],
FaceView: [ function(e, t, i) {
"use strict";
cc._RF.push(t, "c95caUbNAxKdaySdUqbM2Vs", "FaceView");
cc.Class({
extends: cc.Component,
properties: {
facesItem: {
default: null,
type: cc.Prefab,
tooltip: "造型模板"
},
container: {
default: null,
type: cc.Node,
tooltip: "造型容器"
}
},
onLoad: function() {
for (var e in conf.face_cfg) {
var t = cc.instantiate(this.facesItem);
t.getComponent("Face").initFaceWhiteWorldId(1, parseInt(e), !0);
t.scale = .6;
t.height = 180;
t.parent = this.container;
}
},
start: function() {}
});
cc._RF.pop();
}, {} ],
Face: [ function(e, t, i) {
"use strict";
cc._RF.push(t, "39d39hqnCNP+Y76FzbjmIfE", "Face");
cc.Class({
extends: cc.Component,
properties: {
FaceBack: {
default: null,
type: cc.Node,
tooltip: "背景"
},
Random: {
default: null,
type: cc.SpriteFrame,
tooltip: "随机造型"
},
checkbock: {
default: null,
type: cc.Node,
tooltip: "选择按钮"
},
WorldLock: {
default: null,
type: cc.Node,
tooltip: "世界未解锁"
},
FaceBookLock: {
default: null,
type: cc.Node,
tooltip: "facebook未解锁"
},
VideoLock: {
default: null,
type: cc.Node,
tooltip: "视频未解锁"
},
DayLock: {
default: null,
type: cc.Node,
tooltip: "天数未解锁"
},
FaceId: 0,
worldId: 1,
isUnLock: !1,
sfx_gply_face_unlock: {
default: null,
type: cc.AudioClip,
tooltip: "sfx_gply_face_unlock"
},
VideoCount: "0/3"
},
initFaceWhiteWorldId: function(e, t, i) {
var n = gamemain.getLastWordId();
n = n || 1;
this.worldId = n;
this.isList = null != i && i;
null == t && (t = gamemain.getFace());
var a = gamemain.getFaceInfo();
this.FaceId = t;
0 != t || i || (t = a[Math.floor(getRandomInRange(0, a.length - 1))] || 1);
var o = conf.face_cfg[t];
if (4 == o.unlockType) {
var c = getLocalStorage("login_history");
c = c ? JSON.parse(c) : [];
var l = parseInt(o.unlockDay), s = c.length;
if (s >= l) {
a[a.length] = t;
gamemain.setFaceInfo(a);
}
this.DayLock.getComponent(cc.Label).string = String.format("{0}/{1} Days", s, l);
}
var r = conf.theme_cfg[this.worldId];
if (t > 0) {
setNodeColorForHSVA(this.FaceBack, r.list_character);
this.FaceNode && this.FaceNode.removeFromParent(!0);
this.isUnLock = isInArray(a, t);
var h = this;
cc.loader.loadRes("perfab/animation/" + o.sz_name, function(e, t) {
if (e) cc.error(e); else {
var n = cc.instantiate(t);
n.parent = h.node;
h.FaceNode = n;
var a = n.getComponent(cc.Animation);
i || a.play();
cc.loader.releaseRes("perfab/animation/" + o.sz_name);
h.isUnLock || cc.find("face_gray", n) && (cc.find("face_gray", n).active = !0);
}
});
} else {
this.isUnLock = !0;
this.FaceBack.getComponent(cc.Sprite).spriteFrame = this.Random;
}
this.FaceBack.active = i;
if (i) {
this.node.getComponent(cc.Toggle).enabled = this.isUnLock;
this.node.getComponent(cc.Toggle).interactable = this.isUnLock;
this.node.getComponent(cc.Toggle).isChecked = gamemain.getFace() == t;
this.checkbock.active = this.isUnLock;
if (!this.isUnLock) {
setNodeColorForHSVA(this.FaceBack, r.list_face_lock);
this.VideoCount = this.VideoLock.children[0];
if (2 == o.unlockType) {
var u = getLocalStorage("watch_video_times_with_face_id_" + this.FaceId) || 0;
this.VideoCount.getComponent(cc.Label).string = String.format("{0}/{1}", u, o.unlockVideoCount);
}
this.WorldLock.active = 0 == o.unlockType;
this.VideoLock.active = 2 == o.unlockType;
this.FaceBookLock.active = 3 == o.unlockType;
this.DayLock.active = 4 == o.unlockType;
}
}
},
onClick: function() {
if (this.isUnLock) gamemain.setFace(this.FaceId); else {
gamemain.faceComponent = this;
gamemain.showFaceUnlock(this.FaceId, this.worldId, !1, null, this.sfx_gply_face_unlock, function() {});
}
},
updateFaceUI: function() {
this.FaceBack.active = this.isList;
var e = gamemain.getFaceInfo();
this.isUnLock = isInArray(e, this.FaceId);
this.checkbock.active = this.isUnLock;
if (this.isUnLock) {
var t = conf.theme_cfg[this.worldId];
setNodeColorForHSVA(this.FaceBack, t.list_character);
this.WorldLock.active = !1;
this.VideoLock.active = !1;
this.FaceBookLock.active = !1;
this.DayLock.active = !1;
cc.find("face_gray", this.FaceNode) && (cc.find("face_gray", this.FaceNode).active = !1);
this.node.getComponent(cc.Toggle).enabled = !0;
this.node.getComponent(cc.Toggle).interactable = !0;
this.node.getComponent(cc.Toggle).check();
}
var i = conf.face_cfg[this.FaceId];
if (2 == i.unlockType) {
var n = i.unlockVideoCount;
n = parseInt(n);
var a = getLocalStorage("watch_video_times_with_face_id_" + this.FaceId) || 0;
a = parseInt(a);
this.VideoCount.getComponent(cc.Label).string = String.format("{0}/{1}", a, n);
if (a < n) return;
}
}
});
cc._RF.pop();
}, {} ],
GlobalObj: [ function(e, t, i) {
"use strict";
cc._RF.push(t, "72f9882tgNNDIBRXNhvum/Y", "GlobalObj");
window.GlobalObj = cc.Class({
__ctor__: function() {
cc.director.getScheduler().enableForTarget(this);
this.createTicketRecoveryTimer();
this.createInfinityTicketTimer();
this.createFreeHintTimer();
this.createFreeTicketTimer();
},
createTicketRecoveryTimer: function() {
cc.director.getScheduler().unschedule(this.ticketRecoveryCheckTimerAction, this);
var e = gamemain.getTicketCount();
if (!(e >= gamemain.getTicketMaxNum())) {
var t = parseInt(getLocalStorage("nextTicketRecoveryTime")) || 0, i = t - new Date().getTime();
if (i > 0) ; else {
var n = Math.floor(-i / gamemain.getTicketRecoveryInterval());
if (n <= 0) ; else {
gamemain.addTicketCount(n, !1);
if ((e = gamemain.getTicketCount()) >= gamemain.getTicketMaxNum()) return;
}
t += (n + 1) * gamemain.getTicketRecoveryInterval();
setLocalStorage("nextTicketRecoveryTime", t);
i = t - new Date().getTime();
}
i = parseInt(i / 1e3);
cc.director.getScheduler().schedule(this.ticketRecoveryCheckTimerAction, this, i, 1, 0, !1);
}
},
ticketRecoveryCheckTimerAction: function() {
gamemain.addTicketCount(1, !1);
if (gamemain.getTicketCount() >= gamemain.getTicketMaxNum()) cc.director.getScheduler().unschedule(this.ticketRecoveryCheckTimerAction, this); else {
var e = gamemain.getTicketRecoveryInterval(), t = new Date().getTime() + e;
setLocalStorage("nextTicketRecoveryTime", t);
e = parseInt(e / 1e3);
cc.director.getScheduler().unschedule(this.ticketRecoveryCheckTimerAction, this);
cc.director.getScheduler().schedule(this.ticketRecoveryCheckTimerAction, this, e, 1, 0, !1);
}
},
createInfinityTicketTimer: function() {
cc.director.getScheduler().unschedule(this.infinityTicketTimerAction, this);
var e = (parseInt(getLocalStorage("infinityTicketExpiryTime")) || 0) - new Date().getTime();
if (e <= 0) {
window.hasOwnProperty("hallScene") && hallScene && hallScene.updateInfinityTicket(e);
window.hasOwnProperty("gameScene") && gameScene && gameScene.updateInfinityTicket(e);
} else {
e = parseInt(e / 1e3);
cc.director.getScheduler().schedule(this.infinityTicketTimerAction, this, e < 60 ? e : 60, parseInt(e / 60) + 1, 0, !1);
this.infinityTicketTimerAction();
}
},
infinityTicketTimerAction: function() {
var e = (parseInt(getLocalStorage("infinityTicketExpiryTime")) || 0) - new Date().getTime();
if ((e = parseInt(e / 1e3)) < 60) {
cc.director.getScheduler().unschedule(this.infinityTicketTimerAction, this);
e >= 0 && cc.director.getScheduler().schedule(this.infinityTicketTimerAction, this, e, 2, 0, !1);
}
window.hasOwnProperty("hallScene") && hallScene && hallScene.updateInfinityTicket(e);
window.hasOwnProperty("gameScene") && gameScene && gameScene.updateInfinityTicket(e);
},
createFreeHintTimer: function() {
cc.director.getScheduler().unschedule(this.freeHintTimerAction, this);
var e = (parseInt(getLocalStorage("lookFreeHintVideoTime")) || 0) - new Date().getTime();
if (e <= 0) {
window.hasOwnProperty("hallScene") && hallScene && hallScene.updateFreeHint(e);
window.hasOwnProperty("gameScene") && gameScene && gameScene.updateFreeHint(e);
} else {
e = parseInt(e / 1e3);
cc.director.getScheduler().schedule(this.freeHintTimerAction, this, 1, e + 10, 0, !1);
this.freeHintTimerAction();
}
},
stopFreeHintTimer: function() {
cc.director.getScheduler().unschedule(this.freeHintTimerAction, this);
},
freeHintTimerAction: function() {
var e = (parseInt(getLocalStorage("lookFreeHintVideoTime")) || 0) - new Date().getTime();
(e = parseInt(e / 1e3)) <= 0 && cc.director.getScheduler().unschedule(this.freeHintTimerAction, this);
window.hasOwnProperty("hallScene") && hallScene && hallScene.updateFreeHint(e);
window.hasOwnProperty("gameScene") && gameScene && gameScene.updateFreeHint(e);
},
createFreeTicketTimer: function() {
cc.director.getScheduler().unschedule(this.freeTicketTimerAction, this);
var e = (parseInt(getLocalStorage("lookFreeTicketVideoTime")) || 0) - new Date().getTime();
if (e <= 0) {
window.hasOwnProperty("hallScene") && hallScene && hallScene.updateFreeTicket(e);
window.hasOwnProperty("gameScene") && gameScene && gameScene.updateFreeTicket(e);
} else {
e = parseInt(e / 1e3);
cc.director.getScheduler().schedule(this.freeTicketTimerAction, this, 1, e + 10, 0, !1);
this.freeTicketTimerAction();
}
},
stopFreeTicketTimer: function() {
cc.director.getScheduler().unschedule(this.freeHintTimerAction, this);
},
freeTicketTimerAction: function() {
var e = (parseInt(getLocalStorage("lookFreeTicketVideoTime")) || 0) - new Date().getTime();
(e = parseInt(e / 1e3)) <= 0 && cc.director.getScheduler().unschedule(this.freeTicketTimerAction, this);
window.hasOwnProperty("hallScene") && hallScene && hallScene.updateFreeTicket(e);
window.hasOwnProperty("gameScene") && gameScene && gameScene.updateFreeTicket(e);
},
remainTimeToStr: function(e) {
var t = (e = parseInt(e)) / 3600;
(t = parseInt(t)) < 10 && (t = "0" + t);
var i = e % 3600 / 60;
(i = parseInt(i)) < 10 && (i = "0" + i);
var n = e - 3600 * t - 60 * i;
(n = parseInt(n)) < 10 && (n = "0" + n);
return t + ":" + i + ":" + n;
},
remainTimeToStr2: function(e) {
var t = "", i = parseInt(e / 86400);
i > 0 && (t += i + "d");
var n = parseInt((e - 86400 * i) / 3600);
n > 0 && (t += n + "h");
if (0 == i) {
var a = parseInt((e - 86400 * i - 3600 * n) / 60);
a > 0 && (t += a + "m");
if (0 == n) {
parseInt(e - 86400 * i - 3600 * n - 60 * a) > 0 && 0 == a && (t += "1m");
}
}
return t;
}
});
cc._RF.pop();
}, {} ],
HallScene: [ function(e, t, i) {
"use strict";
cc._RF.push(t, "fa7e1r/dFVAsqu3O1qyXu9r", "HallScene");
cc.Class({
extends: cc.Component,
properties: {
StageSelectLayer: {
default: null,
type: cc.PageView,
tooltip: "关卡层"
},
StageLayerPrefab: {
default: null,
type: cc.Prefab,
tooltip: "关卡预制件"
},
SelectStagePageView: {
default: null,
type: cc.Node,
tooltip: "关卡滚动层"
},
GameLangSetting: {
default: null,
type: cc.ToggleContainer,
tooltip: "语言选择"
},
bgmBtn: {
default: null,
type: cc.Toggle,
tooltip: "背景音乐设置"
},
sfxBtn: {
default: null,
type: cc.Toggle,
tooltip: "音效设置"
},
vibrationBtn: {
default: null,
type: cc.Toggle,
tooltip: "震动设置"
},
ticketView: {
default: null,
type: cc.Node,
tooltip: "正常体力值显示层"
},
ticketNum: {
default: null,
type: cc.Label,
tooltip: "正常体力值数量Label"
},
ticketInfinityView: {
default: null,
type: cc.Node,
tooltip: "无限体力值显示层"
},
ticketInfinityTimeLabel: {
default: null,
type: cc.Label,
tooltip: "无限体力值时间Label"
},
hintNumLabel: {
default: null,
type: cc.Label,
tooltip: "剩余提示次数Label"
},
viewGroup: {
default: [],
type: [ cc.Node ],
tooltip: "TabBar对应的视图"
},
tabBar: {
default: null,
type: cc.Node,
tooltip: "底部TabBar"
},
sfx_tran_popup_show: {
default: null,
type: cc.AudioClip,
tooltip: "sfx_tran_popup_show"
},
sfx_ui_menu_swipe: {
default: null,
type: cc.AudioClip,
tooltip: "sfx_ui_menu_swipe"
},
freeHintBtn: {
default: null,
type: cc.Node,
tooltip: "看广告得免费提示按钮"
},
freeTicketBtn: {
default: null,
type: cc.Node,
tooltip: "看广告得免费体力按钮"
},
rateUsPerfab: {
default: null,
type: cc.Prefab
},
aboutUsPerfab: {
default: null,
type: cc.Prefab
},
modalBoxPerfab: {
default: null,
type: cc.Prefab
},
HintShopWnd: {
default: null,
type: cc.Prefab,
tooltip: "购买提示次数"
},
TicketShopWnd: {
default: null,
type: cc.Prefab,
tooltip: "购买体力值弹窗"
}
},
onLoad: function() {
this.currentIndex = -1;
this.rightViewMap = [];
this.leftViewMap = [];
for (var e = 0; e < this.viewGroup.length; e++) {
this.leftViewMap[e] = this.viewGroup[e];
this.rightViewMap[e] = null;
}
gamemain.hiddenNativeAd();
gamemain.hiddenBannerAd();
},
start: function() {
null == window.globalObj && (window.globalObj = new GlobalObj());
window.gameScene = null;
window.hallScene = this;
this.initSetting();
this.updateTicket();
this.updateHint();
var e = gamemain.showTabBarViewIndex;
gamemain.showTabBarViewIndex = 2;
this.showBarView();
this.initStageLayer();
this.scheduleOnce(function() {
gamemain.showTabBarViewIndex = e;
this.showBarView();
}, .05);
gamemain.popViewCount = 0;
this.checkFreeInfinityTicket();
},
checkFreeInfinityTicket: function() {
if (1 == (getLocalStorage("can_get_free_infinity_ticket") || 0)) {
gamemain.setInfinityTicketExpiryTime(1, !1);
setLocalStorage("can_get_free_infinity_ticket", 0);
}
},
updateTicket: function() {
var e = gamemain.getInfinityTicketExpiryTime() - new Date().getTime();
e = parseInt(e / 1e3);
this.updateInfinityTicket(e);
},
updateHint: function() {
this.hasOwnProperty("hintNumLabel") && null != this.hintNumLabel && (this.hintNumLabel.getComponent(cc.Label).string = gamemain.getHintCount());
},
updateInfinityTicket: function(e) {
if ((e = parseInt(e)) <= 0) {
if (this.ticketInfinityView && this.ticketView && this.ticketNum) {
this.ticketInfinityView.active = !1;
this.ticketView.active = !0;
this.ticketNum.getComponent(cc.Label).string = gamemain.getTicketCount();
}
} else if (this.ticketInfinityView && this.ticketView && this.ticketInfinityTimeLabel) {
this.ticketView.active = !1;
this.ticketInfinityView.active = !0;
this.ticketInfinityTimeLabel.getComponent(cc.Label).string = globalObj.remainTimeToStr2(e);
}
},
updateFreeHint: function(e) {
e = parseInt(e);
if (this.freeHintBtn && 2 == this.freeHintBtn.children.length) {
this.freeHintBtn.getComponent(cc.Button).interactable = e <= 0;
if (e <= 0) {
this.freeHintBtn.color = cc.Color.WHITE;
var t = this.freeHintBtn.children[0], i = this.freeHintBtn.children[1];
i.active = !1;
t.active = !0;
i.getComponent(cc.Label).string = "00:00:00";
} else {
this.freeHintBtn.color = cc.Color.GRAY;
var n = this.freeHintBtn.children[0], a = this.freeHintBtn.children[1];
n.active = !1;
a.active = !0;
a.getComponent(cc.Label).string = globalObj.remainTimeToStr(e);
}
}
},
updateFreeTicket: function(e) {
e = parseInt(e);
if (this.freeTicketBtn && 2 == this.freeTicketBtn.children.length) {
this.freeTicketBtn.getComponent(cc.Button).interactable = e <= 0;
if (e <= 0) {
this.freeTicketBtn.color = cc.Color.WHITE;
var t = this.freeTicketBtn.children[0], i = this.freeTicketBtn.children[1];
i.active = !1;
t.active = !0;
i.getComponent(cc.Label).string = "00:00:00";
} else {
this.freeTicketBtn.color = cc.Color.GRAY;
var n = this.freeTicketBtn.children[0], a = this.freeTicketBtn.children[1];
n.active = !1;
a.active = !0;
a.getComponent(cc.Label).string = globalObj.remainTimeToStr(e);
}
}
},
openShop: function(e) {
gamemain.showTabBarViewIndex = 0;
this.showBarView();
var t = e.target.getComponent("UIButton");
t && t.play();
},
showBarView: function() {
gamemain.hiddenNativeAd();
gamemain.hiddenBannerAd();
var e = gamemain.showTabBarViewIndex;
if (this.currentIndex != e) {
this.tabBar.children[e].getComponent("TabBarItem").setHighlight();
var t = this.viewGroup[e].getComponent("TabBarView"), i = 0;
if (this.currentIndex >= 0) if (this.leftViewMap[e]) {
i = 1;
this.leftViewMap[e] = null;
} else if (this.rightViewMap[e]) {
i = 2;
this.rightViewMap[e] = null;
}
t.moveIn(i, this.tabBar.parent.zIndex);
if (this.currentIndex >= 0) {
this.tabBar.children[this.currentIndex].getComponent("TabBarItem").hidden();
var n = this.viewGroup[this.currentIndex];
n.zIndex = this.tabBar.parent.zIndex - 1;
var a = n.getComponent("TabBarView");
1 == i ? this.rightViewMap[this.currentIndex] = n : 2 == i && (this.leftViewMap[this.currentIndex] = n);
a.moveOut(i, this.tabBar.parent.zIndex - 1);
}
if (0 == this.currentIndex) {
globalObj.stopFreeHintTimer();
globalObj.stopFreeTicketTimer();
}
if (0 == e) {
globalObj.createFreeHintTimer();
globalObj.createFreeTicketTimer();
}
this.currentIndex = e;
}
},
initSetting: function() {
for (var e = {
en: 0,
ja: 1,
"zh-Hant": 2,
"zh-Hans": 3,
de: 4,
kr: 5,
es: 6,
fr: 7,
pt: 8,
ru: 9
}, t = 0; t < this.GameLangSetting.toggleItems.length; t++) this.GameLangSetting.toggleItems[t].isChecked = t == e[gamemain.getGameLang()];
this.vibrationBtn.isChecked = 1 == gamemain.getVibration();
this.bgmBtn.isChecked = 1 == gamemain.getBackGroupSound();
this.sfxBtn.isChecked = 0 != gamemain.getEffectSoundSound();
},
setGameLang: function(e, t) {
if (4 == this.currentIndex) {
gamemain.setGameLang(t);
i18nPlug.init(gamemain.getGameLang());
i18nPlug.updateSceneRenderers();
}
},
setBackGroupSound: function(e, t) {
gamemain.setBackGroupSound(e.isChecked ? 1 : 0);
},
setEffectSoundSound: function(e, t) {
gamemain.setEffectSoundSound(e.isChecked ? .9 : 0);
},
setVibration: function(e, t) {
gamemain.setVibration(e.isChecked ? 1 : 0);
},
initStageLayer: function() {
var e = 0;
for (var t in conf.stage_cfg) {
var i = conf.stage_cfg[t], n = this.createStageLayer(i.id, e);
this.StageSelectLayer.insertPage(n, e);
e++;
}
var a = 1, o = gamemain.getLastWordId();
o && (a = o);
getLocalStorage("lastWorld") && (a = 8);
this.StageSelectLayer.scrollToPage(a - 1, .01);
removeLocalStorage("lastWorld");
},
showRateUs: function() {
var e = this, t = cc.instantiate(this.rateUsPerfab), i = t.getComponent("MoveNode");
if (i) {
i.addFinishFirstCallback(function() {
gamemain.playEffect(e.sfx_tran_popup_show);
});
i.play();
}
var n = t.getComponent("MoveNodeList");
n && n.play();
var a = gamemain.getRunningScene();
gamemain.showWnd(a, t, {
havelistener: 1
}, this.modalBoxPerfab);
},
showAboutUs: function() {
var e = this, t = cc.instantiate(this.aboutUsPerfab), i = t.getComponent("MoveNode");
if (i) {
i.addFinishFirstCallback(function() {
gamemain.playEffect(e.sfx_tran_popup_show);
});
i.play();
}
var n = gamemain.getRunningScene();
gamemain.showWnd(n, t, {
havelistener: 1
}, this.modalBoxPerfab);
},
createStageLayer: function(e, t) {
var i = cc.instantiate(this.StageLayerPrefab), n = i.getComponent("StageSelectLayer");
n.initStageLayer(e);
this.StageSelectLayer.addInnerScrollView(n.SV);
var a = this;
n.clickPrePage = function(e, t) {
var i = 0;
if (t > 0) {
i = t - 1;
a.StageSelectLayer.scrollToPage(i);
gamemain.playEffect(a.sfx_ui_menu_swipe);
}
};
n.clickNextPage = function(e, t) {
var i;
i = t + 1;
a.StageSelectLayer.scrollToPage(i, .5);
gamemain.playEffect(a.sfx_ui_menu_swipe);
};
var o = new cc.Component.EventHandler();
o.target = i;
o.component = "StageSelectLayer";
o.customEventData = t;
o.handler = "clickPrePage";
n.LeftButton.clickEvents.push(o);
var c = new cc.Component.EventHandler();
c.target = i;
c.component = "StageSelectLayer";
c.customEventData = t;
c.handler = "clickNextPage";
n.RightButton.clickEvents.push(c);
return i;
},
showHintShopWnd: function() {
var e = cc.instantiate(this.HintShopWnd), t = e.getComponent("PopShop");
this.freeHintBtn = t.freeBtn;
var i = e.getComponent("TipsWnd");
e.playFreeEffect = function() {
setTimeout(function() {
t.freeBtn && t.freeBtn.getComponent("ScaleNode").play(function() {
e && e.playFreeEffect();
});
}, 5e3);
};
var n = {
havelistener: 1,
havecloseBtn: 0,
layer_num: 36,
beginfun: function() {
if (i) {
e.playFreeEffect();
i.show({
title: ""
});
i.cancelcallback = function() {
globalObj.stopFreeHintTimer();
globalObj.stopFreeTicketTimer();
};
}
},
close_callback: function() {
globalObj.stopFreeHintTimer();
globalObj.stopFreeTicketTimer();
}
};
i.playMoveAction();
globalObj.createFreeHintTimer();
var a = gamemain.getRunningScene();
gamemain.showWnd(a, e, n, this.modalBoxPerfab);
},
showTicketShopWnd: function() {
gamemain.hiddenNativeAd();
var e = this, t = cc.instantiate(this.TicketShopWnd), i = t.getComponent("PopShop");
this.freeTicketBtn = i.freeBtn;
var n = t.getComponent("TipsWnd");
t.playFreeEffect = function() {
setTimeout(function() {
i.freeBtn && i.freeBtn.getComponent("ScaleNode").play(function() {
t && t.playFreeEffect();
});
}, 5e3);
};
var a = {
havelistener: 1,
havecloseBtn: 0,
layer_num: 36,
beginfun: function() {
if (n) {
t.playFreeEffect();
n.show({
title: ""
});
n.cancelcallback = function() {
globalObj.stopFreeHintTimer();
globalObj.stopFreeTicketTimer();
e.isGaming ? gamemain.hiddenNativeAd() : gamemain.showNativeAd();
};
}
},
close_callback: function() {
globalObj.stopFreeHintTimer();
globalObj.stopFreeTicketTimer();
e.isGaming ? gamemain.hiddenNativeAd() : gamemain.showNativeAd();
}
};
n.playMoveAction();
globalObj.createFreeTicketTimer();
var o = gamemain.getRunningScene();
gamemain.showWnd(o, t, a, this.modalBoxPerfab);
}
});
cc._RF.pop();
}, {} ],
LanguageData: [ function(e, t, i) {
"use strict";
cc._RF.push(t, "61de062n4dJ7ZM9/Xdumozn", "LanguageData");
var n = e("polyglot.min"), a = null;
window.i18n || (window.i18n = {
languages: {},
curLang: ""
});
0;
function o(e) {
return window.i18n.languages[e];
}
function c(e) {
e && (a ? a.replace(e) : a = new n({
phrases: e,
allowMissing: !0
}));
}
t.exports = {
init: function(e) {
if (e !== window.i18n.curLang) {
var t = o(e) || {};
window.i18n.curLang = e;
c(t);
this.inst = a;
}
},
t: function(e, t) {
if (a) return a.t(e, t);
},
inst: a,
updateSceneRenderers: function() {
for (var e = cc.director.getScene().children, t = [], i = 0; i < e.length; ++i) {
var n = e[i].getComponentsInChildren("LocalizedLabel");
Array.prototype.push.apply(t, n);
}
for (var a = 0; a < t.length; ++a) {
t[a].updateLabel();
}
for (var o = [], c = 0; c < e.length; ++c) {
var l = e[c].getComponentsInChildren("LocalizedSprite");
Array.prototype.push.apply(o, l);
}
for (var s = 0; s < o.length; ++s) {
o[s].updateSprite(window.i18n.curLang);
}
}
};
cc._RF.pop();
}, {
"polyglot.min": "polyglot.min"
} ],
LaunchScene: [ function(e, t, i) {
"use strict";
cc._RF.push(t, "b36a1/ap/5CA7OpLDO43Mu1", "LaunchScene");
cc.Class({
extends: cc.Component,
properties: {},
start: function() {
this.scheduleOnce(function() {
gamemain.enterAnimScene();
}, 2);
}
});
cc._RF.pop();
}, {} ],
LevelButton: [ function(e, t, i) {
"use strict";
cc._RF.push(t, "2f952ktg1lB74zzh39U6heR", "LevelButton");
cc.Class({
extends: cc.Button,
properties: {
m_scaleTarget: {
default: null,
type: cc.Node,
tooltip: "点击放大目标（开始点的时候）"
},
m_pressedColor: {
default: new cc.Color(),
tooltip: "点击放改变颜色（开始点的时候）"
},
m_isPlayClick: {
default: !0,
visible: !1
}
},
start: function() {},
_onTouchBegan: function(e) {
this._super(e);
if (this.m_isPlayClick) {
this.m_scaleTarget && this.m_scaleTarget.runAction(transition.sequence([ cc.scaleTo(.05, 2, 2), cc.scaleTo(.05, 1, 1) ]));
if (this.m_pressedColor) {
var t = this;
t.normalC = this.node.color.clone();
this.node.color = this.m_pressedColor.clone();
transition.delayTo(this.node, {
delayTime: .1,
onComplete: function() {
t.node.color = t.normalC;
}
});
this.m_scaleTarget.runAction(transition.sequence([ cc.scaleTo(.05, 2, 2), cc.scaleTo(.05, 1, 1) ]));
}
}
}
});
cc._RF.pop();
}, {} ],
LevelMask: [ function(e, t, i) {
"use strict";
cc._RF.push(t, "ed7acRXofJKQbBSHV1Lthrh", "LevelMask");
cc.Class({
extends: cc.Component,
properties: {},
onTouchStart: function(e) {
e.stopPropagation();
},
onLoad: function() {
this.node.on(cc.Node.EventType.TOUCH_START, this.onTouchStart, this);
},
start: function() {},
onDestroy: function() {
this.node.off(cc.Node.EventType.TOUCH_START, this.onTouchStart, this);
}
});
cc._RF.pop();
}, {} ],
LocalizedLabel: [ function(e, t, i) {
"use strict";
cc._RF.push(t, "744dcs4DCdNprNhG0xwq6FK", "LocalizedLabel");
var n = e("LanguageData");
cc.Class({
extends: cc.Component,
editor: {
executeInEditMode: !0,
menu: "i18n/LocalizedLabel"
},
properties: {
dataID: {
get: function() {
return this._dataID;
},
set: function(e) {
if (this._dataID !== e) {
this._dataID = e;
this.updateLabel();
}
}
},
_dataID: ""
},
onLoad: function() {
0;
n.inst || n.init();
this.fetchRender();
},
fetchRender: function() {
var e = this.getComponent(cc.Label);
if (e) {
this.label = e;
this.updateLabel();
} else ;
},
updateLabel: function() {
if (!this.label) {
this.fetchRender();
if (!this.label) {
cc.error("Failed to update localized label, label component is invalid!");
return;
}
}
n.t(this.dataID) && (this.label.string = n.t(this.dataID));
}
});
cc._RF.pop();
}, {
LanguageData: "LanguageData"
} ],
LocalizedSprite: [ function(e, t, i) {
"use strict";
cc._RF.push(t, "f34ac2GGiVOBbG6XlfvgYP4", "LocalizedSprite");
var n = e("SpriteFrameSet");
cc.Class({
extends: cc.Component,
editor: {
executeInEditMode: !0,
inspector: "packages://i18n/inspector/localized-sprite.js",
menu: "i18n/LocalizedSprite"
},
properties: {
spriteFrameSet: {
default: [],
type: n
}
},
onLoad: function() {
this.fetchRender();
},
fetchRender: function() {
var e = this.getComponent(cc.Sprite);
if (e) {
this.sprite = e;
this.updateSprite(window.i18n.curLang);
} else ;
},
getSpriteFrameByLang: function(e) {
for (var t = 0; t < this.spriteFrameSet.length; ++t) if (this.spriteFrameSet[t].language === e) return this.spriteFrameSet[t].spriteFrame;
},
updateSprite: function(e) {
if (this.sprite) {
var t = this.getSpriteFrameByLang(e);
!t && this.spriteFrameSet[0] && (t = this.spriteFrameSet[0].spriteFrame);
this.sprite.spriteFrame = t;
} else cc.error("Failed to update localized sprite, sprite component is invalid!");
}
});
cc._RF.pop();
}, {
SpriteFrameSet: "SpriteFrameSet"
} ],
ModalBox: [ function(e, t, i) {
"use strict";
cc._RF.push(t, "5868cqDQxxIIqG5O1FttKSJ", "ModalBox");
cc.Class({
extends: cc.Component,
properties: {
menuItem: {
default: null,
type: cc.Node
},
showNode: {
default: null,
type: cc.Node
},
listenerfun: null,
beginfun: null,
close_callback: null,
closetime: .1,
havelistener: 0,
sfx_tran_popup_hide: {
default: null,
type: cc.AudioClip,
tooltip: "sfx_tran_popup_hide"
},
sfx_ui_general_button: {
default: null,
type: cc.AudioClip,
tooltip: "sfx_ui_general_button"
}
},
onClickLayer: function() {
if (0 != this.havelistener) if (2 == this.havelistener) {
gamemain.closeMenuItemAndBg(this.showNode, this.closetime, null, null, this.sfx_tran_popup_hide, this.sfx_ui_general_button);
gamemain.popViewCount--;
gamemain.popViewCount < 0 && (gamemain.popViewCount = 0);
} else if (this.listenerfun) this.listenerfun(); else {
if (null != this.showNode.canColse) {
if (1 == this.showNode.canColse) {
gamemain.closeMenuItemAndBg(this.showNode, this.closetime, null, null, this.sfx_tran_popup_hide, this.sfx_ui_general_button);
gamemain.popViewCount--;
gamemain.popViewCount < 0 && (gamemain.popViewCount = 0);
}
} else {
gamemain.closeMenuItemAndBg(this.showNode, this.closetime, null, null, this.sfx_tran_popup_hide, this.sfx_ui_general_button);
gamemain.popViewCount--;
gamemain.popViewCount < 0 && (gamemain.popViewCount = 0);
}
this.close_callback && this.close_callback();
}
},
showWnd: function(e, t, i) {
null != i.setOpacity && i.setOpacity;
var n = null != i.layer_num ? i.layer_num : 0;
this.lister_bg = i.lister_bg ? i.lister_bg : t;
this.close_callback = i.close_callback;
this.closetime = null != i.closetime ? i.closetime : .1;
this.listenerfun = i.listenerfun;
this.havelistener = null != i.havelistener ? i.havelistener : 1;
this.showNode = t;
this.beginfun = i.beginfun;
if (!t.parent) {
t.menuItem = this.menuItem;
null != i.opacityValue && (this.menuItem.opacity = i.opacityValue);
t.active = !0;
e && (n ? e.addChild(this.node, n) : e.addChild(this.node));
this.node.addChild(t, 999);
var a = this;
this.menuItem.on(cc.Node.EventType.TOUCH_START, function(e) {
var t = e.getLocation(), i = a.menuItem.convertToNodeSpace(t);
if (a.menuItem) {
a.lister_bg.getBoundingBoxToWorld().contains(i) ? a.menuItem.isin = 1 : a.menuItem.isin = 0;
}
}, this);
this.menuItem.on(cc.Node.EventType.TOUCH_END, function(e) {
if (2 == a.havelistener) gamemain.closeMenuItemAndBg(a.showNode, a.closetime, null, null, this.sfx_tran_popup_hide, this.sfx_ui_general_button); else {
var t = e.getLocation(), i = a.menuItem.convertToNodeSpace(t);
if (a.menuItem) {
a.lister_bg.getBoundingBoxToWorld().contains(i) || 0 == a.menuItem.isin && null == a.menuItem.is_Action && a.onClickLayer();
}
}
}, this);
gamemain.popViewCount++;
}
},
start: function() {
if (this.beginfun) {
var e = this;
window.setTimeout(function() {
e.beginfun();
e.beginfun = null;
}, 1);
}
}
});
cc._RF.pop();
}, {} ],
MoveHintView: [ function(e, t, i) {
"use strict";
cc._RF.push(t, "20533+OJNtKErJHkWrIwzA8", "MoveHintView");
cc.Class({
extends: cc.Component,
properties: {
moveHintView: {
default: null,
type: cc.Node,
tooltip: "显示移动提示"
},
hintUpImg: {
default: null,
type: cc.SpriteFrame,
tooltip: "提示方向-上"
},
hintRightImg: {
default: null,
type: cc.SpriteFrame,
tooltip: "提示方向-右"
},
hintDownImg: {
default: null,
type: cc.SpriteFrame,
tooltip: "提示方向-下"
},
hintLeftImg: {
default: null,
type: cc.SpriteFrame,
tooltip: "提示方向-左"
},
hintLabel: {
default: null,
type: cc.Label,
tooltip: "没有提示了"
}
},
onLoad: function() {},
start: function() {},
setTheme: function(e) {
this.currentTheme = e;
for (var t = 0; t < this.moveHintView.children.length; t++) {
var i = this.moveHintView.children[t];
i.active = !1;
setNodeColorForHSVA(i, e.list_background);
}
},
resetAllWithSolution: function(e) {
this.solution = e;
this.allHintsArray = [];
this.resetCurrent();
},
resetCurrent: function() {
this.hintTimesAfterReset = 0;
this.currentHintArray = [];
this.currentHintCount = 0;
this.hadMovedStepArray = [];
this.hadMovedStepWithHintArray = [];
this.movedError = !1;
this.noHintCanUse = !1;
this.resetAllSpriteNode();
},
resetAllSpriteNode: function() {
this.node.active = !1;
this.hintLabel.node.active = !1;
for (var e = 0; e < this.moveHintView.children.length; e++) {
var t = this.moveHintView.children[e];
t.active = !1;
cc.director.getActionManager().removeAllActionsFromTarget(t, !0);
}
},
isDecrementHint: function() {
if (this.noHintCanUse) return !1;
var e = this.allHintsArray.length;
if (0 == e) return !0;
var t = this.hadMovedStepArray.length;
return e > 0 && e <= t;
},
isResetSnakes: function() {
if (this.noHintCanUse) return !1;
var e = this.hadMovedStepArray.length, t = this.allHintsArray.length;
if (e > 0 && 0 == t) {
this.resetCurrent();
return !0;
}
var i = this.hadMovedStepWithHintArray.length;
if (t > 0) if (0 == i) {
if (e != t) {
this.resetCurrent();
return !0;
}
for (var n = 0; n < e; n++) {
if (this.hadMovedStepArray[n] != this.allHintsArray[n]) {
this.resetCurrent();
return !0;
}
}
} else {
if (e != i) {
this.resetCurrent();
return !0;
}
for (var a = 0; a < e; a++) {
if (this.hadMovedStepArray[a] != this.hadMovedStepWithHintArray[a]) {
this.resetCurrent();
return !0;
}
}
}
return !1;
},
updateWithMove: function(e) {
var t = this.solutionByDirection(e);
this.hadMovedStepArray.push(t);
var i = this.hadMovedStepArray.length;
if (this.noHintCanUse) this.resetAllSpriteNode(); else if (!this.movedError) {
var n = this.allHintsArray.length;
if (0 != n && 0 != this.currentHintArray.length) if (n < i) this.resetAllSpriteNode(); else {
var a = this.allHintsArray[i - 1];
if (a == t) {
this.hadMovedStepWithHintArray.push(a);
var o = this.hadMovedStepWithHintArray.length, c = this.currentHintCount - this.currentHintArray.length;
this.moveHintView.children[c].color = cc.Color.BLUE;
this.currentHintArray.splice(i - o, 1);
if (0 == this.currentHintArray.length) {
this.resetAllSpriteNode();
this.stepByHintUsed(this.hintTimesAfterReset) == this.stepByHintUsed(this.hintTimesAfterReset + 1) && (this.noHintCanUse = !0);
}
} else {
this.movedError = !0;
var l = this.currentHintCount - this.currentHintArray.length, s = new cc.Color().fromHSV(this.currentTheme.list_background[0] / 360, this.currentTheme.list_background[1] / 100, this.currentTheme.list_background[2] / 100), r = this.moveHintView.children[l];
r.runAction(cc.sequence(cc.repeat(cc.sequence(cc.tintTo(.1, s.getR(), s.getG(), s.getB()), cc.delayTime(.1), cc.tintTo(.1, cc.Color.RED.getR(), cc.Color.RED.getG(), cc.Color.RED.getB())), 10), cc.callFunc(function() {
r.color = cc.Color.RED;
})));
}
}
}
},
showMoveHint: function() {
this.hintLabel.node.active = !1;
setNodeColorForHSVA(this.node, this.currentTheme.list_title);
this.node.active = !0;
if (this.noHintCanUse) {
setNodeColorForHSVA(this.hintLabel.node, this.currentTheme.list_background);
this.hintLabel.node.active = !0;
} else if (!(this.currentHintArray.length > 0 || this.movedError)) {
if (this.hadMovedStepArray.length == this.hadMovedStepWithHintArray.length) {
this.currentHintCount = 0;
this.currentHintArray = [];
var e = this.stepByHintUsed(this.hintTimesAfterReset), t = this.stepByHintUsed(this.hintTimesAfterReset + 1);
if (e != t) {
for (var i = 0, n = e; n < t; n++) {
var a = this.solution[n];
this.currentHintArray.push(a);
this.allHintsArray.length <= n && this.allHintsArray.push(a);
var o = this.moveHintView.children[i];
o.getComponent(cc.Sprite).spriteFrame = this.getDirectionTexture(a);
setNodeColorForHSVA(o, this.currentTheme.list_background);
o.active = !0;
i++;
}
this.currentHintCount = this.currentHintArray.length;
this.hintTimesAfterReset++;
} else {
this.noHintCanUse = !0;
setNodeColorForHSVA(this.hintLabel.node, this.currentTheme.list_background);
this.hintLabel.node.active = !0;
}
} else this.movedError = !0;
}
},
stepByHintUsed: function(e) {
var t = this.solution.length, i = Math.ceil(t / 3);
i > this.moveHintView.children.length && (i = this.moveHintView.children.length);
var n = i * e;
n > t && (n = t);
return n;
},
solutionByDirection: function(e) {
switch (e) {
case Direction.DirectionUp:
return "U";

case Direction.DirectionDown:
return "D";

case Direction.DirectionLeft:
return "L";

case Direction.DirectionRight:
return "R";
}
return "";
},
getDirection: function(e) {
switch (e) {
case "U":
return Direction.DirectionUp;

case "D":
return Direction.DirectionDown;

case "L":
return Direction.DirectionLeft;

case "R":
return Direction.DirectionRight;
}
},
getDirectionTexture: function(e) {
switch (e) {
case "U":
return this.hintUpImg;

case "D":
return this.hintDownImg;

case "L":
return this.hintLeftImg;

case "R":
return this.hintRightImg;
}
}
});
cc._RF.pop();
}, {} ],
MoveNodeList: [ function(e, t, i) {
"use strict";
cc._RF.push(t, "32d03cJ+p5LCqIzOxSCbfvo", "MoveNodeList");
cc.Class({
extends: cc.Component,
properties: {
MoveNode: {
default: [],
type: [ cc.Node ],
tooltip: "跟随移动的节点组"
}
},
start: function() {},
play: function(e) {
for (var t in this.MoveNode) if (this.MoveNode[t]) {
var i = this.MoveNode[t].getComponent("MoveNode");
if (i) {
1 == e ? i.IsLeftToRight = !1 : 2 == e && (i.IsLeftToRight = !0);
i.play();
}
}
}
});
cc._RF.pop();
}, {} ],
MoveNode: [ function(e, t, i) {
"use strict";
cc._RF.push(t, "b227dAAw0lGDKD/fPeY5TJ3", "MoveNode");
cc.Class({
extends: cc.Component,
properties: {
FirstDistance: {
default: 300,
type: cc.Integer,
tooltip: "开始出现距离"
},
SecondDistance: {
default: 20,
type: cc.Integer,
tooltip: "二次回弹距离"
},
Horizontal: {
default: !0,
tooltip: "是否水平移动"
},
IsLeftToRight: {
default: !0,
tooltip: "水平移动时是否左到右"
},
Vertical: {
default: !0,
animatable: !1,
tooltip: "是否垂直移动"
},
IsDownToUp: {
default: !0,
tooltip: "垂直移动时是否下到上"
},
m_finishFirstCallback: null
},
start: function() {},
play: function() {
var e = this.FirstDistance ? this.FirstDistance : 300, t = this.SecondDistance ? this.SecondDistance : 20, i = [ 0, 0, 0, 0 ], n = [ 0, 0, 0, 0 ];
this.Horizontal && (i = this.IsLeftToRight ? [ -e, e, -t, t ] : [ e, -e, t, -t ]);
this.Vertical && (n = this.IsDownToUp ? [ -e, e, -t, t ] : [ e, -e, t, -t ]);
this.node.xList = i;
this.node.yList = n;
var a = this.m_finishFirstCallback;
this.node.opacity = 0;
transition.moveBy(this.node, {
time: .01,
x: this.node.xList[0],
y: this.node.yList[0],
onComplete: function(e) {
e.opacity = 255;
transition.moveBy(e, {
time: .1,
x: e.xList[1],
y: e.yList[1],
onComplete: function(e) {
a && a();
transition.moveBy(e, {
time: .05,
x: e.xList[2],
y: e.yList[2],
onComplete: function(e) {
transition.moveBy(e, {
time: .05,
x: e.xList[3],
y: e.yList[3],
onComplete: function(e) {}
});
}
});
}
});
}
});
},
playToHorizontal: function(e) {
null == e && (e = this.IsLeftToRight);
this.Horizontal = !0;
this.Vertical = !1;
this.IsLeftToRight = e;
this.play();
},
playToVertical: function(e) {
null == e && (e = this.IsDownToUp);
this.Vertical = !0;
this.Horizontal = !1;
this.IsLeftToRight = e;
this.play();
},
addFinishFirstCallback: function(e) {
this.m_finishFirstCallback = e;
}
});
cc._RF.pop();
}, {} ],
NestablePageView_Outer: [ function(e, t, i) {
"use strict";
cc._RF.push(t, "f737bH38NBDpKbSIkpiv803", "NestablePageView_Outer");
cc.Class({
extends: cc.PageView,
properties: {
m_InnerScrollViews: [ e("NestableScrollView_Inner") ],
m_PlanDir: {
default: null,
visible: !1
},
m_ScrollingInnerSv: {
default: null,
visible: !1
},
m_nodeByMove: {
default: 0,
visible: !1
},
sfx_ui_menu_swipe: {
default: null,
type: cc.AudioClip,
tooltip: "sfx_ui_menu_swipe"
}
},
addInnerScrollView: function(e) {
e.setOuterScrollView(this);
this.m_InnerScrollViews.push(e);
},
_isHisChild: function(e, t) {
return e == t || null != e.parent && (e.parent == t || this._isHisChild(e.parent, t));
},
_findScrollingInnerSv: function(e) {
for (var t = 0; t < this.m_InnerScrollViews.length; t++) {
if (this._isHisChild(e, this.m_InnerScrollViews[t].node)) return this.m_InnerScrollViews[t];
}
return null;
},
isDifferentBetweenSettingAndPlan: function(e) {
return 0 != this.m_PlanDir && ((1 != this.m_PlanDir || !e.horizontal) && (-1 != this.m_PlanDir || !e.vertical));
},
_hasNestedViewGroup: function(e, t) {
if (e.eventPhase === cc.Event.CAPTURING_PHASE) return !1;
},
_onTouchBegan: function(e, t) {
this._touchBeganPosition = e.touch.getLocation();
if (this.enabledInHierarchy && !this._hasNestedViewGroup(e, t)) {
this.m_PlanDir = null;
this.m_ScrollingInnerSv = null;
var i = e.touch;
this.content && this._handlePressLogic(i);
this._touchMoved = !1;
this._stopPropagationIfTargetIsMe(e);
this.m_nodeByMove = 1;
}
},
_onTouchMoved: function(e, t) {
if (this.enabledInHierarchy && !this._hasNestedViewGroup(e, t)) {
var i = e.touch, n = i.getLocation().sub(i.getStartLocation());
if (null == this.m_PlanDir && n.mag() > 7) {
this.m_ScrollingInnerSv = this._findScrollingInnerSv(e.target);
if (null != this.m_ScrollingInnerSv) {
var a = this.m_ScrollingInnerSv.content.getContentSize(), o = this.m_ScrollingInnerSv.node.getContentSize();
this.m_ScrollingInnerSv.vertical && a.height > o.height || this.m_ScrollingInnerSv.horizontal && a.width > o.width ? this.m_PlanDir = Math.abs(n.x) > Math.abs(n.y) ? 1 : -1 : this.m_PlanDir = 0;
} else this.m_PlanDir = 0;
}
if (this.content && !this.isDifferentBetweenSettingAndPlan(this)) {
this._handleMoveLogic(i);
switch (this.m_nodeByMove) {
case 1:
gamemain.playEffect(this.sfx_ui_menu_swipe);
if (n.x < -40) {
this.m_nodeByMove = 2;
this.playFollowMove(1);
} else if (n.x > 40) {
this.m_nodeByMove = 3;
this.playFollowMove(2);
}
break;

case 2:
if (n.x > 40) {
this.m_nodeByMove = 4;
this.playFollowMove(2);
}
break;

case 3:
if (n.x < -40) {
this.m_nodeByMove = 4;
this.playFollowMove(1);
}
}
}
if (this.cancelInnerEvents && null == this.m_ScrollingInnerSv) {
if (n.mag() > 7 && !this._touchMoved && e.target != this.node) {
var c = new cc.Event.EventTouch(e.getTouches(), e.bubbles);
c.type = cc.Node.EventType.TOUCH_CANCEL;
c.touch = e.touch;
c.simulate = !0;
e.target.dispatchEvent(c);
this._touchMoved = !0;
}
this._stopPropagationIfTargetIsMe(e);
}
}
},
getPageByIndex: function(e) {
for (var t = this.getPages(), i = 0; i < t.length; i++) if (e == i) return t[i];
return null;
},
playFollowMove: function(e) {
var t = this._curPageIdx;
1 == e ? t += 1 : 2 == e && (t -= 1);
var i = this.getPageByIndex(t);
if (i) {
var n = i.getComponent("MoveNodeList");
n && n.play(e);
}
},
scrollToPage: function(e, t) {
this._super(e, t);
},
getPageSize: function() {
return this.getPages().length;
}
});
cc._RF.pop();
}, {
NestableScrollView_Inner: "NestableScrollView_Inner"
} ],
NestableScrollView_Inner: [ function(e, t, i) {
"use strict";
cc._RF.push(t, "63025oXtAVCMbClFCa+VCFc", "NestableScrollView_Inner");
cc.Class({
extends: cc.ScrollView,
properties: {
m_OuterScrollView: {
default: null,
visible: !1
}
},
setOuterScrollView: function(e) {
this.m_OuterScrollView = e;
},
_onTouchMoved: function(e, t) {
if (this.enabledInHierarchy && !this._hasNestedViewGroup(e, t)) {
var i = e.touch, n = i.getLocation().sub(i.getStartLocation());
this.content && (this.m_OuterScrollView.isDifferentBetweenSettingAndPlan(this) || this._handleMoveLogic(i));
if (this.cancelInnerEvents) {
if (n.mag() > 7 && !this._touchMoved && e.target != this.node) {
var a = new cc.Event.EventTouch(e.getTouches(), e.bubbles);
a.type = cc.Node.EventType.TOUCH_CANCEL;
a.touch = e.touch;
a.simulate = !0;
e.target.dispatchEvent(a);
this._touchMoved = !0;
}
this._stopPropagationIfTargetIsMe(e);
}
}
}
});
cc._RF.pop();
}, {} ],
PopShop: [ function(e, t, i) {
"use strict";
cc._RF.push(t, "06bd73MFk5KR6jMG76R5K5/", "PopShop");
cc.Class({
extends: cc.Component,
properties: {
sfx_shop_free_hint: {
default: null,
type: cc.AudioClip,
tooltip: "sfx_shop_free_hint"
},
freeBtn: {
default: null,
type: cc.Node,
tooltip: "看广告得免费道具按钮"
}
},
getFreeHints: function() {
gamemain.playEffect(this.sfx_shop_free_hint);
gamemain.showVideoAd(1, 1);
},
getFreeTickets: function() {
gamemain.playEffect(this.sfx_shop_free_hint);
gamemain.showVideoAd(3, 3);
},
buySmallHint: function() {
gamemain.pay(0);
},
buyLargeHint: function() {
gamemain.pay(1);
},
buyRemoveAd: function() {
gamemain.pay(2);
},
buyInfinityTicket: function() {
gamemain.pay(3);
},
start: function() {}
});
cc._RF.pop();
}, {} ],
Progress: [ function(e, t, i) {
"use strict";
cc._RF.push(t, "e353eAhWcZB348aCTerWsrh", "Progress");
cc.Class({
extends: cc.Component,
properties: {},
ProgressTo: function(e, t, i, n) {
this.Progress = this.node.getComponent(cc.ProgressBar);
this.frame = e;
this.addProgress = (t - this.Progress.progress) / e;
this.targetProgress = t;
this.endCalback = n;
this.updateCallback = i;
this.IsStop = !1;
},
stop: function() {
this.IsStop = !0;
},
update: function(e) {
if (!this.IsStop) if (this.frame > 0) {
this.frame--;
this.Progress.progress += this.addProgress;
this.frame <= 0 && (this.Progress.progress = this.targetProgress);
this.updateCallback && this.updateCallback(this.Progress.progress);
} else {
this.endCalback && this.endCalback();
this.stop();
}
}
});
cc._RF.pop();
}, {} ],
QuestView: [ function(e, t, i) {
"use strict";
cc._RF.push(t, "918295jTrVP1Yv5ssqn0mBM", "QuestView");
cc.Class({
extends: cc.Component,
properties: {
questItem: {
default: null,
type: cc.Prefab,
tooltip: "造型模板"
},
container: {
default: null,
type: cc.Node,
tooltip: "造型容器"
}
},
onLoad: function() {
for (var e in conf.quest_cfg) {
var t = cc.instantiate(this.questItem);
t.parent = this.container;
t.active = !0;
var i = conf.quest_cfg[e];
cc.find("quest_name", t).getComponent("LocalizedLabel").dataID = i.sz_name;
cc.find("reaw_count", t).getComponent(cc.Label).string = i.reward;
t.progressAction = function(e) {
var t = conf.quest_cfg[e], i = gamemain.getQuestInfo()[e], n = cc.find("quest_count", this).getComponent(cc.Label), a = cc.find("QuestProgressBar", this), o = cc.find("Quest_Completed", this);
o.active = !1;
var c = i.count;
n.string = "0 / " + t.counter;
a.getComponent(cc.ProgressBar).progress = 0;
a.getComponent("Progress").ProgressTo(30, c / t.counter, function(e) {
n.string = Math.floor(e * t.counter) + " / " + t.counter;
}, function() {
i.isCompleted && (o.active = !0);
});
};
t.progressAction(e);
}
},
start: function() {}
});
cc._RF.pop();
}, {} ],
RateUs: [ function(e, t, i) {
"use strict";
cc._RF.push(t, "90492cm1x9I16qTlpEPJcnV", "RateUs");
cc.Class({
extends: cc.Component,
properties: {
sfx_tran_popup_hide: {
default: null,
type: cc.AudioClip,
tooltip: "sfx_tran_popup_hide"
},
sfx_ui_general_button: {
default: null,
type: cc.AudioClip,
tooltip: "sfx_ui_general_button"
}
},
start: function() {},
gotoRate: function() {
cc.sys.openURL("https://play.google.com/store/apps/details?id=com.umbrella.mazedash");
gamemain.closeMenuItemAndBg(this.node, null, null, null, this.sfx_tran_popup_hide, this.sfx_ui_general_button);
}
});
cc._RF.pop();
}, {} ],
ScaleNode: [ function(e, t, i) {
"use strict";
cc._RF.push(t, "e13e4u/tVZOHbJMqh0aAFx8", "ScaleNode");
cc.Class({
extends: cc.Component,
properties: {
FirstMultiple: {
default: 1.8,
type: cc.Float,
tooltip: "开始放大倍数"
},
SecondMultiple: {
default: 1.1,
type: cc.Float,
tooltip: "二次放大倍数"
}
},
start: function() {},
play: function(e) {
var t = this.FirstMultiple ? this.FirstMultiple : 1.8, i = this.SecondMultiple ? this.SecondMultiple : 1.1;
this.node.scaleList = [ t, 1 / t, i, 1 / i ];
transition.scaleBy(this.node, {
time: .05,
scaleX: this.node.scaleList[0],
scaleY: this.node.scaleList[0],
onComplete: function(t) {
transition.scaleBy(t, {
time: .08,
scaleX: t.scaleList[1],
scaleY: t.scaleList[1],
onComplete: function(t) {
transition.scaleBy(t, {
time: .03,
scaleX: t.scaleList[2],
scaleY: t.scaleList[2],
onComplete: function(t) {
transition.scaleBy(t, {
time: .03,
scaleX: t.scaleList[3],
scaleY: t.scaleList[3],
onComplete: function(t) {
e && e();
}
});
}
});
}
});
}
});
}
});
cc._RF.pop();
}, {} ],
Shop: [ function(e, t, i) {
"use strict";
cc._RF.push(t, "f687aXCu4BLho1hJPvH6VOt", "Shop");
cc.Class({
extends: cc.Component,
properties: {
buyRemoveAd: {
default: null,
type: cc.Node,
tooltip: "去广告"
},
freeHintBtn: {
default: null,
type: cc.Node,
tooltip: "免费提示"
},
freeTicketBtn: {
default: null,
type: cc.Node,
tooltip: "免费体力"
},
sfx_shop_free_hint: {
default: null,
type: cc.AudioClip,
tooltip: "sfx_shop_free_hint"
}
},
start: function() {
window.shop = this;
this.setRemoveAdItem();
this.unschedule(this.playFreeEffect);
this.schedule(this.playFreeEffect, 5);
},
playFreeEffect: function() {
this.freeHintBtn && this.freeHintBtn.getComponent("ScaleNode") && this.freeHintBtn.getComponent("ScaleNode").play(function() {});
this.freeTicketBtn && this.freeTicketBtn.getComponent("ScaleNode") && this.freeTicketBtn.getComponent("ScaleNode").play(function() {});
},
setRemoveAdItem: function() {
"false" == getLocalStorage("showAd") ? this.buyRemoveAd.active = !1 : this.buyRemoveAd.active = !0;
},
getFreeHints: function(e, t) {
gamemain.playEffect(this.sfx_shop_free_hint);
gamemain.showVideoAd(1, 1);
},
getFreeTickets: function(e, t) {
gamemain.playEffect(this.sfx_shop_free_hint);
gamemain.showVideoAd(3, 3);
},
creatorOrder: function(e, t) {
gamemain.pay(t);
},
restorePurchase: function(e, t) {},
onPayCallback: function(e, t) {}
});
cc._RF.pop();
}, {} ],
SpriteFrameSet: [ function(e, t, i) {
"use strict";
cc._RF.push(t, "97019Q80jpE2Yfz4zbuCZBq", "SpriteFrameSet");
var n = cc.Class({
name: "SpriteFrameSet",
properties: {
language: "",
spriteFrame: cc.SpriteFrame
}
});
t.exports = n;
cc._RF.pop();
}, {} ],
StageSelectLayer: [ function(e, t, i) {
"use strict";
cc._RF.push(t, "c6d6fJdZcRKK61fobcR1sb1", "StageSelectLayer");
cc.Class({
extends: cc.Component,
properties: {
BgLayer: {
default: null,
type: cc.Node,
tooltip: "背景层"
},
Title: {
default: null,
type: cc.Label,
tooltip: "关卡标题"
},
LeftButton: {
default: null,
type: cc.Button,
tooltip: "向左按钮"
},
RightButton: {
default: null,
type: cc.Button,
tooltip: "向右按钮"
},
SelectLevelLayer: {
default: null,
type: cc.Node,
tooltip: "小关卡层"
},
LevelBtnPrefab: {
default: null,
type: cc.Prefab,
tooltip: "关卡预制件"
},
SV: {
default: null,
type: cc.ScrollView,
tooltip: "滚动层"
},
SelectLayer: {
default: null,
type: cc.Node,
tooltip: "选择关卡层"
},
LockLayer: {
default: null,
type: cc.Node,
tooltip: "锁层"
},
m_stageId: {
default: null,
visible: !1
}
},
start: function() {},
initStageLayer: function(e) {
this.m_stageId = e;
this.hideAllLayer();
this.showLockLayer();
},
hideAllLayer: function() {
this.SelectLayer.active = !1;
this.LockLayer.active = !1;
},
showLockLayer: function() {
var e = conf.worlds[this.m_stageId], t = gamemain.getPassLevelCount(), i = e.require - t;
if (i <= 0) this.updateUnlockLayer(); else {
this.LockLayer.active = !0;
var n = conf.theme_cfg[this.m_stageId];
this.LeftButton.node.getChildByName("Sprite").active = !1;
this.RightButton.node.getChildByName("Sprite").active = !1;
n.list_background && this.BgLayer && setNodeColorForHSVA(this.BgLayer, n.list_background);
var a = this.LockLayer.getChildByName("LockSprite");
setNodeColorForHSVA(a, n.list_level_lock);
var o = this.LockLayer.getChildByName("Condition"), c = o.getChildByName("Label"), l = o.getChildByName("Sprite");
c.getComponent(cc.Label).string = i;
setNodeColorForHSVA(c, n.list_level_require);
setNodeColorForHSVA(l, n.list_level_require);
}
},
updateUnlockLayer: function() {
this.SelectLayer.active = !0;
if (this.m_stageId) {
var e = this.m_stageId, t = conf.stage_cfg[e];
t.sz_title && this.Title && (this.Title.getComponent("LocalizedLabel").dataID = t.sz_title);
var i = conf.theme_cfg[e];
i.list_level_title && this.Title && setNodeColorForHSVA(this.Title.node, i.list_level_title);
i.list_background && this.BgLayer && setNodeColorForHSVA(this.BgLayer, i.list_background);
var n = this.LeftButton.node.getChildByName("Sprite"), a = this.RightButton.node.getChildByName("Sprite");
setNodeColorForHSVA(n, i.list_level_title);
setNodeColorForHSVA(a, i.list_level_title);
var o = conf.stage_level_cfg[e], c = gamemain.getPassMaxLevelId(e) + 1, l = gamemain.getSkipList(e), s = null, r = 0;
for (var h in o) {
var u = o[h].levelId, d = cc.instantiate(this.LevelBtnPrefab);
d.parent = this.SelectLevelLayer;
s || (s = d.getContentSize());
r += 1;
for (var p = [], m = 0; m < i.list_level_disabled.length; m++) p[m] = 1 == m ? i.list_level_disabled[m] + getRandomInRange(-2, 2) : i.list_level_disabled[m];
var f = i.list_level_disabled_num;
if (u == c || l[u] && 1 == l[u]) {
p = i.list_level_next;
f = i.list_level_num;
} else if (u < c) {
p = i.list_level_complete;
f = i.list_level_num;
}
setNodeColorForHSVA(d, p);
var g = d.getChildByName("Level");
if (g) {
setNodeColorForHSVA(g, f);
g.getComponent(cc.Label).string = u;
}
var v = d.getComponent("LevelButton"), _ = new cc.Component.EventHandler();
_.target = this.node;
_.component = "StageSelectLayer";
_.customEventData = o[h].id;
if (u <= c) {
_.handler = "clickEnterGame";
v.m_pressedColor = getColorForHSVA(i.list_level_disabled);
} else {
_.handler = "notEnterGame";
v.m_isPlayClick = !1;
}
v.clickEvents.push(_);
}
gamemain.m_stageLayer[e] = this.SV;
var y = this.SV.content.getContentSize().width, T = Math.floor(y / s.width), k = Math.ceil(r / T), b = s.height * k;
this.SV.content.setContentSize(cc.size(y, b));
if (gamemain.m_stageViewOffsetList[e]) this.SV.scrollToOffset(gamemain.m_stageViewOffsetList[e]); else {
var S = Math.ceil(c / T), w = 0;
S > 7 && (w = s.height * (S - 7));
this.SV.scrollToOffset(cc.v2(0, w));
}
}
},
clickEnterGame: function(e, t) {
gamemain.ticketIsEnough() ? gamemain.enterEnterGameScene(t) : hallScene && hallScene.openShop(e);
},
notEnterGame: function(e, t) {
var i = e.target.getChildByName("Level"), n = i.x, a = i.y;
i.runAction(cc.repeat(transition.sequence([ cc.moveTo(.05, cc.v2(n - 5, a)), cc.moveTo(.05, cc.v2(n + 5, a)), cc.callFunc(function() {
i.x = 0;
i.y = 0;
}) ]), 2));
}
});
cc._RF.pop();
}, {} ],
TabBarItem: [ function(e, t, i) {
"use strict";
cc._RF.push(t, "3a1b4wlkV1Ac4ovOO5t4yk4", "TabBarItem");
cc.Class({
extends: cc.Component,
properties: {
tabBarIndex: 0,
bgNode: cc.Node,
hallNode: cc.Node
},
onTouchStart: function(e) {
this.show();
e.stopPropagation();
},
show: function() {
gamemain.showTabBarViewIndex = this.tabBarIndex;
this.hallController.showBarView();
this.uiButton.play();
},
setHighlight: function() {
this.bgNode.active = !0;
},
hidden: function() {
this.bgNode.active = !1;
},
onLoad: function() {
this.hallController = this.hallNode.getComponent("HallScene");
this.uiButton = this.node.getComponent("UIButton");
this.node.on(cc.Node.EventType.TOUCH_START, this.onTouchStart, this);
},
start: function() {},
onDestroy: function() {
this.node.off(cc.Node.EventType.TOUCH_START, this.onTouchStart, this);
}
});
cc._RF.pop();
}, {} ],
TabBarView: [ function(e, t, i) {
"use strict";
cc._RF.push(t, "b4795xzAFlCQ4S8bNi+G47m", "TabBarView");
cc.Class({
extends: cc.Component,
properties: {},
animationPlayCallback: function(e, t) {},
animationFinishedCallback: function(e, t) {
if ("moveOutToRight" == t.name || "moveOutToLeft" == t.name) {
this.node.opacity = 0;
this.node.y = this.node.parent.height;
} else "moveInFromLeft" == t.name || t.name;
},
moveIn: function(e, t) {
this.node.y = 0;
this.node.zIndex = t;
this.node.active = !0;
this.node.opacity = 255;
1 == e ? this.animation.play("moveInFromLeft") : 2 == e ? this.animation.play("moveInFromRight") : this.node.y = 0;
},
moveOut: function(e, t) {
this.node.zIndex = t;
1 == e ? this.animation.play("moveOutToRight") : 2 == e && this.animation.play("moveOutToLeft");
},
onLoad: function() {
cc.director.getScheduler().enableForTarget(this);
this.animation = this.node.getComponent(cc.Animation);
this.animation.on(cc.Animation.EventType.PLAY, this.animationPlayCallback, this);
this.animation.on(cc.Animation.EventType.FINISHED, this.animationFinishedCallback, this);
},
start: function() {},
onDestroy: function() {}
});
cc._RF.pop();
}, {} ],
TipsWnd: [ function(e, t, i) {
"use strict";
cc._RF.push(t, "39a3ecQhkZA5KVGKGlnKZqF", "TipsWnd");
cc.Class({
extends: cc.Component,
properties: {
btnCancel: {
default: null,
type: cc.Node
},
btnConfirm: {
default: null,
type: cc.Node
},
titleLabel: {
default: null,
type: cc.Label
},
tipsLabel: {
default: null,
type: cc.Node
},
tips_bg: {
default: null,
type: cc.Node
},
content: {
default: null,
type: cc.Node
},
callback: null,
cancelcallback: null,
moveNode: {
default: [],
type: [ cc.Node ],
tooltip: "跟随移动的节点组"
},
okLabel: {
default: null,
type: cc.Label
},
cancelLabel: {
default: null,
type: cc.Label
},
soundFile: {
default: null,
type: cc.AudioClip,
tooltip: "sfx_tran_popup_show"
},
sfx_tran_popup_hide: {
default: null,
type: cc.AudioClip,
tooltip: "sfx_tran_popup_hide"
},
sfx_ui_general_button: {
default: null,
type: cc.AudioClip,
tooltip: "sfx_ui_general_button"
},
modalBoxPerfab: {
default: null,
type: cc.Prefab
}
},
start: function() {
this.playMoveAction();
},
onClickConfirm: function() {
gamemain.closeMenuItemAndBg(this.node, null, null, !0, this.sfx_tran_popup_hide, this.sfx_ui_general_button);
gamemain.popViewCount--;
gamemain.popViewCount < 0 && (gamemain.popViewCount = 0);
this.callback && this.callback();
},
onClickCancel: function() {
gamemain.closeMenuItemAndBg(this.node, null, null, null, this.sfx_tran_popup_hide, this.sfx_ui_general_button);
gamemain.popViewCount--;
gamemain.popViewCount < 0 && (gamemain.popViewCount = 0);
this.cancelcallback && this.cancelcallback();
},
initTipsLayer: function(e, t, i, n, a) {
this.btnConfirm && (e.isTwo ? this.btnConfirm.active = !0 : this.btnConfirm.active = !1);
this.callback = i;
this.cancelcallback = n;
if (a) this.hideTipsStr(); else {
t && (this.tipsLabel.getComponent(cc.Label).fontSize = t);
e.tipsLocalizedId && this.tipsLabel ? this.tipsLabel.getComponent("LocalizedLabel").dataID = e.tipsLocalizedId : e.tips && this.tipsLabel && (this.tipsLabel.getComponent(cc.Label).string = e.tips);
e.titleLocalizedId && this.titleLabel ? this.titleLabel.node.getComponent("LocalizedLabel").dataID = e.titleLocalizedId : e.title && this.titleLabel && (this.titleLabel.string = e.title);
this.titleLabel && (this.titleLabel.node.parent.active = null != e.title || null != e.titleLocalizedId);
e.okLocalizedId && this.okLabel ? this.okLabel.node.getComponent("LocalizedLabel").dataID = e.okLocalizedId : e.okStr && (this.okLabel.string = e.okStr);
e.cancelLocalizedId && this.cancelLabel ? this.cancelLabel.node.getComponent("LocalizedLabel").dataID = e.cancelLocalizedId : e.cancelStr && (this.cancelLabel.string = e.cancelStr);
e.sound && (this.soundFile = e.sound);
}
},
hideTipsStr: function() {
this.tipsLabel.active = !1;
},
playMoveAction: function() {
var e = this.node.getComponent("MoveNode");
if (e) {
var t = this;
e.addFinishFirstCallback(function() {
gamemain.playEffect(t.soundFile);
});
e.play();
}
for (var i in this.moveNode) {
var n = this.moveNode[i].getComponent("MoveNode");
n && n.play();
}
},
show: function(e, t, i, n, a, o) {
this.initTipsLayer(e, t, i, n);
this.node.canColse = 1;
1 == a && (this.node.canColse = 0);
var c = 36;
o && (c = o);
var l = {
havelistener: 1,
havecloseBtn: 0,
layer_num: c
}, s = gamemain.getRunningScene();
gamemain.showWnd(s, this.node, l, this.modalBoxPerfab);
}
});
cc._RF.pop();
}, {} ],
UIButton: [ function(e, t, i) {
"use strict";
cc._RF.push(t, "5fc4anElEhKb6vgZqz6ySQq", "UIButton");
cc.Class({
extends: cc.Component,
properties: {
sfx_ui_general_button: {
default: null,
type: cc.AudioClip,
tooltip: "sfx_ui_general_button"
}
},
start: function() {},
play: function() {
gamemain.playEffect(this.sfx_ui_general_button);
}
});
cc._RF.pop();
}, {} ],
WorldCompleted: [ function(e, t, i) {
"use strict";
cc._RF.push(t, "649e4e5H0RBw5RmVifHIxHp", "WorldCompleted");
cc.Class({
extends: cc.Component,
properties: {
Bg: {
default: null,
type: cc.Node,
tooltip: "背景"
},
TickSp: {
default: null,
type: cc.Node,
tooltip: "勾结点"
},
WorldId: {
default: null,
type: cc.Label,
tooltip: "世界id"
},
MoveNode: {
default: [],
type: [ cc.Node ],
tooltip: "跟随移动的节点组"
},
sfx_gend_world_complete: {
default: null,
type: cc.AudioClip,
tooltip: "sfx_gend_world_complete"
}
},
start: function() {},
show: function(e) {
if (e) {
this.WorldId.string = e;
var t = conf.theme_cfg[e];
t.list_world_complete_back && this.Bg && setNodeColorForHSVA(this.Bg, t.list_world_complete_back);
t.list_world_complete_tick && this.TickSp && setNodeColorForHSVA(this.TickSp, t.list_world_complete_tick);
var i = this.node.getComponent("MoveNode"), n = this;
if (i) {
i.addFinishFirstCallback(function() {
gamemain.playEffect(n.sfx_gend_world_complete);
for (var e in n.MoveNode) {
n.MoveNode[e].getComponent("MoveNode").play();
}
});
i.play();
}
}
}
});
cc._RF.pop();
}, {} ],
gameScene: [ function(e, t, i) {
"use strict";
cc._RF.push(t, "0f5few8hnlI9KOt575i+n6w", "gameScene");
cc.Class({
extends: cc.Component,
properties: {
gameMap: {
default: null,
type: cc.Node,
tooltip: "地图容器"
},
backGroup: {
default: null,
type: cc.Node,
tooltip: "背景"
},
title_label: {
default: null,
type: cc.Label,
tooltip: "标题"
},
btnGroup: {
default: null,
type: cc.Node,
tooltip: "按钮组"
},
HintCount: {
default: null,
type: cc.Node,
tooltip: "提示次数"
},
more_btn_group: {
default: null,
type: cc.Node,
tooltip: "更多菜单"
},
level_complete: {
default: null,
type: cc.Node,
tooltip: "关卡完成"
},
vignette: {
default: null,
type: cc.Node,
tooltip: "小饰品"
},
hintTips: {
default: null,
type: cc.Node,
tooltip: "提示功能说明"
},
menuTips: {
default: null,
type: cc.Node,
tooltip: "提示功能说明"
},
guid_node: {
default: null,
type: cc.Node,
tooltip: "新手引导"
},
guid_finger: {
default: null,
type: cc.Animation,
tooltip: "新手引导手指"
},
btnMore: {
default: null,
type: cc.Node,
tooltip: "菜单按钮"
},
menu_list: {
default: null,
type: cc.Node,
tooltip: "菜单列表"
},
FreeHint: {
default: null,
type: cc.Node,
tooltip: "跳过关卡"
},
questBord: {
default: null,
type: cc.Node,
tooltip: "任务提示"
},
SkipNode: {
default: null,
type: cc.Node,
tooltip: "跳过提示"
},
QuestWind: {
default: null,
type: cc.Node,
tooltip: "任务窗口"
},
QuestComplete: {
default: null,
type: cc.Node,
tooltip: "任务完成窗口"
},
UnlockWorld: {
default: null,
type: cc.Node,
tooltip: "世界解锁窗口"
},
FacesWnd: {
default: null,
type: cc.Node,
tooltip: "造型选择窗口"
},
FacesItem: {
default: null,
type: cc.Node,
tooltip: "造型模板"
},
worldId: 1,
level: 1,
guideIndex: 1,
showAd: !0,
levelAd: 1,
maxRefreshTimes: {
default: 4,
tooltip: "每格体力值刷新次数"
},
refreshTimes: {
default: 4,
tooltip: "本次游戏剩余刷新次数"
},
levelFailedView: {
default: null,
type: cc.Node,
tooltip: "游戏失败后弹出的视图"
},
ticketLabel1: {
default: null,
type: cc.Node,
tooltip: "剩余体力值(游戏底部右上角显示)"
},
ticketLabel2: {
default: null,
type: cc.Node,
tooltip: "剩余体力值(游戏失败后的弹窗内显示)"
},
refreshTimesLabel1: {
default: null,
type: cc.Node,
tooltip: "显示本次游戏剩余刷新次数的Label(游戏底部显示)"
},
refreshTimesLabel2: {
default: null,
type: cc.Node,
tooltip: "显示本次游戏剩余刷新次数的Label(游戏失败后的弹窗内显示)"
},
btnOK: {
default: null,
type: cc.Node,
tooltip: "对号按钮"
},
btnContinue: {
default: null,
type: cc.Node,
tooltip: "继续下一关卡(游戏通关后的弹窗内显示)"
},
btnGroup2: {
default: null,
type: cc.Node,
tooltip: "按钮组(游戏通关后的弹窗内显示)"
},
removeAdBtn1: {
default: null,
type: cc.Node,
tooltip: "移除广告按钮(游戏通关后的弹窗内显示)"
},
removeAdBtn2: {
default: null,
type: cc.Node,
tooltip: "移除广告按钮(游戏失败后的弹窗内显示)"
},
moveHintRoot: {
default: null,
type: cc.Node,
tooltip: "显示移动提示"
},
sfx_ui_bubble_show: {
default: null,
type: cc.AudioClip,
tooltip: "sfx_ui_bubble_show"
},
sfx_gply_board_restart: {
default: null,
type: cc.AudioClip,
tooltip: "sfx_gply_board_restart"
},
sfx_gend_quest_show: {
default: null,
type: cc.AudioClip,
tooltip: "sfx_gend_quest_show"
},
sfx_gend_quest_complete: {
default: null,
type: cc.AudioClip,
tooltip: "sfx_gend_quest_complete"
},
sfx_tran_popup_show: {
default: null,
type: cc.AudioClip,
tooltip: "sfx_tran_popup_show"
},
sfx_gend_world_unlock: {
default: null,
type: cc.AudioClip,
tooltip: "sfx_gend_world_unlock"
},
sfx_gend_world_unlock_lock: {
default: null,
type: cc.AudioClip,
tooltip: "sfx_gend_world_unlock_lock"
},
sfx_tran_popup_hide: {
default: null,
type: cc.AudioClip,
tooltip: "sfx_tran_popup_hide"
},
sfx_ui_general_button: {
default: null,
type: cc.AudioClip,
tooltip: "sfx_ui_general_button"
},
sfx_gply_face_unlock: {
default: null,
type: cc.AudioClip,
tooltip: "sfx_gply_face_unlock"
},
HintShopWnd: {
default: null,
type: cc.Prefab,
tooltip: "购买提示次数"
},
TicketShopWnd: {
default: null,
type: cc.Prefab,
tooltip: "购买体力值弹窗"
},
RemoveAdWnd: {
default: null,
type: cc.Prefab,
tooltip: "去除广告弹窗"
},
worldCompletedPerfab: {
default: null,
type: cc.Prefab
},
modalBoxPerfab: {
default: null,
type: cc.Prefab
},
GameAlertPerfab: {
default: null,
type: cc.Prefab,
tooltip: "退出游戏弹窗"
}
},
onDisable: function() {
this.node.getComponentsInChildren(cc.Animation).forEach(function(e) {
e.stop();
});
},
updateTicket: function() {
var e = gamemain.getInfinityTicketExpiryTime() - new Date().getTime();
e = parseInt(e / 1e3);
this.updateInfinityTicket(e);
},
updateHint: function() {
this.hasOwnProperty("HintCount") && null != this.HintCount && (this.HintCount.getComponent(cc.Label).string = gamemain.getHintCount());
},
updateInfinityTicket: function(e) {
if ((e = parseInt(e)) <= 0) {
var t = gamemain.getTicketCount();
this.hasOwnProperty("ticketLabel1") && null != this.ticketLabel1 && (this.ticketLabel1.getComponent(cc.Label).string = t);
this.hasOwnProperty("ticketLabel2") && null != this.ticketLabel2 && (this.ticketLabel2.getComponent(cc.Label).string = t);
} else {
this.hasOwnProperty("ticketLabel1") && null != this.ticketLabel1 && (this.ticketLabel1.getComponent(cc.Label).string = "∞");
this.hasOwnProperty("ticketLabel2") && null != this.ticketLabel2 && (this.ticketLabel2.getComponent(cc.Label).string = "∞");
}
},
updateFreeHint: function(e) {
e = parseInt(e);
if (this.freeHintBtn && 2 == this.freeHintBtn.children.length) {
this.freeHintBtn.getComponent(cc.Button).interactable = e <= 0;
if (e <= 0) {
this.freeHintBtn.color = cc.Color.WHITE;
var t = this.freeHintBtn.children[0], i = this.freeHintBtn.children[1];
i.active = !1;
t.active = !0;
i.getComponent(cc.Label).string = "00:00:00";
} else {
this.freeHintBtn.color = cc.Color.GRAY;
var n = this.freeHintBtn.children[0], a = this.freeHintBtn.children[1];
n.active = !1;
a.active = !0;
a.getComponent(cc.Label).string = globalObj.remainTimeToStr(e);
}
}
},
updateFreeTicket: function(e) {
e = parseInt(e);
if (this.freeTicketBtn && 2 == this.freeTicketBtn.children.length) {
this.freeTicketBtn.getComponent(cc.Button).interactable = e <= 0;
if (e <= 0) {
this.freeTicketBtn.color = cc.Color.WHITE;
var t = this.freeTicketBtn.children[0], i = this.freeTicketBtn.children[1];
i.active = !1;
t.active = !0;
i.getComponent(cc.Label).string = "00:00:00";
} else {
this.freeTicketBtn.color = cc.Color.GRAY;
var n = this.freeTicketBtn.children[0], a = this.freeTicketBtn.children[1];
n.active = !1;
a.active = !0;
a.getComponent(cc.Label).string = globalObj.remainTimeToStr(e);
}
}
},
setRemoveAdItem: function() {
if ("false" == getLocalStorage("showAd")) {
this.showAd = !1;
this.hasOwnProperty("removeAdBtn1") && null != this.removeAdBtn1 && (this.removeAdBtn1.active = !1);
this.hasOwnProperty("removeAdBtn2") && null != this.removeAdBtn2 && (this.removeAdBtn2.active = !1);
gamemain.hiddenNativeAd();
gamemain.hiddenBannerAd();
}
},
showHintTips: function() {
var e = this, t = function() {
e.hintTips.scaleY = 0;
var t = e.hintTips;
t.active = !0;
transition.scaleTo(t, {
scaleY: 1,
time: .02
});
gamemain.playEffect(e.sfx_ui_bubble_show);
};
if (getLocalStorage("level_gift")) transition.delayTo(e.node, {
delayTime: 1,
onComplete: t
}); else {
setLocalStorage("level_gift", 1);
gamemain.addHintCount(3);
this.HintCount.getComponent(cc.Label).string = gamemain.getHintCount();
this.showCompleteQuest(null, t);
}
},
enterLevel: function(e, t, i) {
this.newWorld = null;
if (e && t) {
this.isGaming = !0;
this.worldId = e;
this.level = t;
this.level_complete.active = !1;
this.levelFailedView.active = !1;
this.btnGroup.active = !0;
this.title_label.node.active = !0;
var n = conf.theme_cfg[e];
setNodeColorForHSVA(this.backGroup, n.list_background);
this.title_label.string = e + " - " + t;
setNodeColorForHSVA(this.title_label.node, n.list_ui);
this.moveHintController.setTheme(n);
if (conf.stage_level_cfg && conf.stage_level_cfg[e] && conf.stage_level_cfg[e][t]) {
var a = conf.stage_level_cfg[e][t];
setLocalStorage("enter_levels_id", a.mapId);
this.gameMap.getComponent("game_map").loadLevel(e, a.mapId, i);
this.guid_node.active = a.mapId < 4;
this.guid_finger.node.active = !1;
if (a.mapId < 3) {
this.guid_finger.node.active = !0;
this.guideIndex = 1;
this.guid_finger.play("finger_" + this.guideIndex);
}
cc.find("guid_tips", this.guid_node).getComponent("LocalizedLabel").dataID = [ "", "Swipe to move.", "Fill the maze to win.", "Try it yourself." ][a.mapId];
for (var o in this.btnGroup.children) {
var c = this.btnGroup.children[o];
"btn_restart" == c.name || "btn_menu" == c.name ? c.active = a.mapId > 3 : c.active = a.mapId > 5;
setNodeColorForHSVA(c, n.list_ui);
}
setNodeColorForHSVA(cc.find("backgroup", this.FreeHint), n.list_level_toggle_one);
setNodeColorForHSVA(cc.find("skip_Label", this.FreeHint), n.list_level_toggle_two);
}
setNodeColorForHSVA(this.HintCount, n.list_ui);
this.updateHint();
setNodeColorForHSVA(this.ticketLabel1, n.list_ui);
this.updateTicket();
this.refreshTimesLabel1.getComponent(cc.Label).string = this.refreshTimes;
setNodeColorForHSVA(this.refreshTimesLabel1, n.list_ui);
this.refreshTimesLabel2.getComponent(cc.Label).string = this.maxRefreshTimes;
gamemain.hiddenNativeAd();
gamemain.showBannerAd();
this.FreeHint.active = !1;
this.FreeHint.scale = 0;
var l = this;
transition.delayTo(this.node, {
delayTime: 6,
onComplete: function() {
l.showSkipLevel();
gamemain.playEffect(l.sfx_ui_bubble_show);
}
});
}
},
restart: function(e, t) {
if (!this.gameMapDoAction) {
this.gameMapDoAction = !0;
this.gameMap.stopAllActions();
this.level_complete.active = !1;
if (0 == Number(t)) {
this.levelFailedView.active = !1;
if (!(this.refreshTimes > 0)) {
if (!gamemain.ticketIsEnough()) {
this.showTicketShopWnd();
this.gameMapDoAction = !1;
return;
}
gamemain.addTicketCount(-1);
this.showFailed();
this.gameMapDoAction = !1;
return;
}
this.refreshTimes--;
} else if (1 == Number(t)) {
this.levelFailedView.active = !1;
this.refreshTimes = this.maxRefreshTimes;
} else if (2 == Number(t)) {
if (!gamemain.ticketIsEnough()) {
this.showTicketShopWnd();
this.gameMapDoAction = !1;
return;
}
this.refreshTimes = this.maxRefreshTimes;
gamemain.hiddenNativeAd();
this.levelFailedView.active = !1;
}
this.moveHintController.resetCurrent();
this.refreshTimesLabel1.getComponent(cc.Label).string = this.refreshTimes;
this.enterLevel(this.worldId, this.level, null);
var i = this;
transition.scaleTo(i.gameMap, {
scale: 0,
time: .2,
onComplete: function() {
transition.scaleTo(i.gameMap, {
scale: 1,
time: .2,
onComplete: function() {
i.gameMapDoAction = !1;
}
});
}
});
gamemain.playEffect(this.sfx_gply_board_restart);
}
},
removeAd: function(e) {
var t = e.target.getComponent("UIButton");
t && t.play();
gamemain.pay("2");
},
onLoad: function() {
this.moveHintController = this.moveHintRoot.getComponent("MoveHintView");
this.moveHintController.resetCurrent();
this.isGaming = !1;
gamemain.popViewCount = 0;
},
start: function() {
this.isGaming = !1;
null == window.globalObj && (window.globalObj = new GlobalObj());
window.hallScene = null;
window.gameScene = this;
this.menu_list.scaleY = 0;
this.showVignettte();
if ("false" == getLocalStorage("showAd")) {
this.showAd = !1;
this.removeAdBtn1.active = !1;
this.removeAdBtn2.active = !1;
} else {
this.removeAdBtn1.active = !0;
this.removeAdBtn2.active = !0;
}
var e = getLocalStorage("enter_levels_id") || 1, t = conf.level_cfg[e];
this.moveHintController.resetAllWithSolution(t.sz_solution);
this.gameMap.getComponent("MoveNode").playToVertical(!0);
6 == e && this.showHintTips();
this.enterLevel(t.wordId, t.levelId);
var i = this;
this.node.on(cc.Node.EventType.TOUCH_START, function(e) {
i.doTouchThing && i.doTouchThing("began", e.getLocation());
});
this.node.on(cc.Node.EventType.TOUCH_MOVE, function(e) {
i.doTouchThing && i.doTouchThing("moved", e.getLocation());
});
this.node.on(cc.Node.EventType.TOUCH_END, function(e) {
i.doTouchThing && i.doTouchThing("ended", e.getLocation());
});
this.node.on(cc.Node.EventType.TOUCH_CANCEL, function(e) {
i.doTouchThing && i.doTouchThing("cancelled", e.getLocation());
});
},
HintGame: function() {
if (!this.gameMapDoAction) {
this.gameMapDoAction = !0;
if (this.moveHintController.isDecrementHint()) {
if (gamemain.getHintCount() <= 0) {
this.showHintShopWnd();
this.gameMapDoAction = !1;
return;
}
gamemain.addHintCount(-1);
this.HintCount.getComponent(cc.Label).string = gamemain.getHintCount();
}
var e = this.gameMap.getComponent("game_map");
if (e.isLoadData || e.isHinting) this.gameMapDoAction = !1; else {
this.gameMap.stopAllActions();
this.level_complete.active = !1;
var t = this;
if (this.moveHintController.isResetSnakes()) {
this.enterLevel(this.worldId, this.level, null);
transition.scaleTo(t.gameMap, {
scale: 0,
time: .2,
onComplete: function() {
transition.scaleTo(t.gameMap, {
scale: 1,
time: .2,
onComplete: function() {
t.gameMapDoAction = !1;
}
});
}
});
gamemain.playEffect(t.sfx_gply_board_restart);
} else this.gameMapDoAction = !1;
t.moveHintController.showMoveHint();
}
}
},
doTouchThing: function(e, t) {
"began" == e ? this.touchPoint = t : "moved" != e && this.tryMove(t);
this.hintTips.active && (this.hintTips.active = !1);
this.menuTips.active && (this.menuTips.active = !1);
this.hideMenu();
},
tryMove: function(e) {
var t = this.touchPoint.x - e.x, i = this.touchPoint.y - e.y, n = cc.v2(0, 0);
if (!(Math.abs(t) < 15 && Math.abs(i) < 15)) {
n = Math.abs(t) > Math.abs(i) ? t > 0 ? Direction.DirectionLeft : Direction.DirectionRight : i > 0 ? Direction.DirectionDown : Direction.DirectionUp;
var a = this;
this.gameMap.getComponent("game_map").moveSanke(n, function(e) {
a.guideIndex++;
0 != e && a.moveHintController.updateWithMove(n);
"complete" == e ? a.showComplete() : e > 0 && a.guid_finger.play("finger_" + a.guideIndex);
});
}
},
clickEnterHallScene: function(e, t) {
if (0 == Number(t)) {
if (gamemain.getInfinityTicketExpiryTime() > new Date().getTime()) {
gamemain.enterHallScene();
return;
}
gamemain.showGameAlert(this.GameAlertPerfab, "Quit", "Cancel", "If you quit now, you will lose 1 power. Are you sure to quit?", function() {
gamemain.addTicketCount(-1);
gamemain.enterHallScene();
}, function() {});
} else 1 == Number(t) ? gamemain.enterHallScene() : 2 == Number(t) && gamemain.enterHallScene();
},
showVignettte: function() {
var e = cc.find("Content", this.vignette), t = Math.floor(getRandomInRange(1, 4));
for (var i in e.children) {
var n = e.children[i];
n.removeAllChildren(!0);
if (n.name != "vignette" + t) {
var a = cc.instantiate(cc.find("vignettes/stage" + this.worldId + "_bg1", this.vignette)), o = a.children.length, c = Math.floor(getRandomInRange(1, o));
for (var l in a.children) a.children[l].active = l == c - 1;
a.parent = n;
}
}
},
reviewLevel: function() {
gamemain.hiddenNativeAd();
gamemain.showBannerAd();
this.level_complete.opacity = 0;
this.level_complete.getComponent(cc.Button).interactable = !0;
this.btnGroup2.active = !1;
this.btnContinue.active = !1;
},
closeReView: function() {
this.level_complete.opacity = 220;
this.level_complete.getComponent(cc.Button).interactable = !1;
this.btnGroup2.active = !0;
this.btnContinue.active = !0;
if ("false" == getLocalStorage("showAd")) {
this.removeAdBtn1.active = !1;
this.removeAdBtn2.active = !1;
} else {
gamemain.hiddenBannerAd();
gamemain.showNativeAd();
this.removeAdBtn1.active = !0;
this.removeAdBtn2.active = !0;
}
},
showFailed: function() {
this.isGaming = !1;
gamemain.hiddenBannerAd();
this.levelFailedView.active = !0;
var e = conf.theme_cfg[this.worldId], t = this.levelFailedView.children[0].children[0].children;
for (var i in t) {
i > 0 && setNodeColorForHSVA(t[i], e.list_ui);
t[i].rotation = -90;
t[i].opacity = 0;
i < t.length - 1 && setNodeColorForHSVA(t[i].children[0], e.list_ui);
}
for (var n in t) {
transition.fadeIn(t[n], {
time: .16
});
transition.rotateBy(t[n], {
rotation: 90,
time: .16
});
}
if ("false" == getLocalStorage("showAd")) {
this.removeAdBtn1.active = !1;
this.removeAdBtn2.active = !1;
} else {
gamemain.showNativeAd();
this.removeAdBtn1.active = !0;
this.removeAdBtn2.active = !0;
}
},
showComplete: function() {
this.isGaming = !1;
gamemain.hiddenBannerAd();
this.btnGroup.active = !1;
this.title_label.node.active = !1;
this.FreeHint.active = !1;
this.FreeHint.scale = 0;
this.FreeHint.stopAllActions();
var e = conf.theme_cfg[this.worldId];
setNodeColorForHSVA(this.level_complete, e.list_background);
this.level_complete.opacity = 220;
this.level_complete.active = !0;
setNodeColorForHSVA(this.btnOK, e.list_level_title);
this.btnOK.opacity = 255;
this.btnOK.rotation = 0;
this.btnOK.active = !0;
this.btnOK.setScale(0);
setNodeColorForHSVA(this.btnContinue, e.list_level_title);
this.btnContinue.rotation = 90;
this.btnContinue.opacity = 0;
this.btnContinue.active = !0;
this.btnGroup2.active = !0;
var t = this.btnGroup2.children[0].children;
for (var i in t) {
setNodeColorForHSVA(t[i], e.list_ui);
t[i].rotation = -90;
t[i].opacity = 0;
}
var n = this;
transition.scaleTo(n.btnOK, {
scale: 1.1,
time: .16,
onComplete: function() {
transition.scaleTo(n.btnOK, {
scale: .9,
time: .05,
onComplete: function() {
transition.scaleTo(n.btnOK, {
scale: 1,
time: .05,
onComplete: function() {
var e = n.worldId, i = n.level, a = !1;
if (gamemain.checkSkipLevel(e, i)) {
gamemain.deleteSkipLevel(e, i);
a = !0;
}
if (1 == e && i <= 2) {
i > 1 && gamemain.getPassMaxLevelId(e) < i && gamemain.checkQuest(e);
gamemain.setPassMaxLevel(e, i);
n.nextLevel();
} else {
transition.rotateBy(n.btnOK, {
rotation: -90,
time: .16
});
transition.fadeOut(n.btnOK, {
time: .16
});
transition.fadeIn(n.btnContinue, {
time: .16,
onComplete: function() {
gamemain.checkFinishAllLevel(e, i, a) && n.showWorldCompleted(e);
if (1 == e && i <= 9 && gamemain.getPassMaxLevelId(e) < i) {
gamemain.checkQuest(e);
gamemain.setPassMaxLevel(e, i);
} else if (gamemain.getPassMaxLevelId(e) < i) {
var t = gamemain.checkQuest(e);
n.showQuestTick(t, 0, function() {
for (var e in t) if (gamemain.getQuestInfo()[t[e]].isCompleted) {
gamemain.hiddenNativeAd();
n.showCompleteQuest(t[e], function() {
n.isGaming ? gamemain.hiddenNativeAd() : gamemain.showNativeAd();
});
}
});
gamemain.setPassMaxLevel(e, i);
}
var o = gamemain.checkNewWorld();
o && n.showUnlockWorld(o);
var c = gamemain.checkFaceUnLock(e, i);
if (c) {
var l = gamemain.getFaceInfo();
if (!isInArray(l, c)) {
l[l.length] = c;
gamemain.setFaceInfo(l);
gamemain.hiddenNativeAd();
gamemain.showFaceUnlock(c, e, !0, function() {
gamemain.setFace(c);
n.changeSankeFace(c);
n.isGaming ? gamemain.hiddenNativeAd() : gamemain.showNativeAd();
}, this.sfx_gply_face_unlock, function() {
n.isGaming ? gamemain.hiddenNativeAd() : gamemain.showNativeAd();
});
}
}
}
});
transition.rotateBy(n.btnContinue, {
rotation: -90,
time: .16
});
for (var o in t) {
transition.fadeIn(t[o], {
time: .16
});
transition.rotateBy(t[o], {
rotation: 90,
time: .16
});
}
}
}
});
}
});
}
});
this.levelAd++;
gamemain.showNativeAd();
if (this.levelAd > 3 && this.showAd) {
this.levelAd = 1;
if ("false" == getLocalStorage("showAd")) {
this.removeAdBtn1.active = !1;
this.removeAdBtn2.active = !1;
} else {
gamemain.showInterstitialAd();
this.removeAdBtn1.active = !0;
this.removeAdBtn2.active = !0;
}
} else if (this.showAd) if ("false" == getLocalStorage("showAd")) {
this.removeAdBtn1.active = !1;
this.removeAdBtn2.active = !1;
} else {
this.removeAdBtn1.active = !0;
this.removeAdBtn2.active = !0;
}
},
nextLevel: function() {
gamemain.hiddenNativeAd();
if (conf.stage_level_cfg[this.worldId][parseInt(this.level) + 1]) this.level = parseInt(this.level) + 1; else {
if (!conf.stage_level_cfg[parseInt(this.worldId) + 1]) {
setLocalStorage("lastWorld", 1);
gamemain.enterHallScene();
return;
}
this.worldId = parseInt(this.worldId) + 1;
this.level = 1;
}
this.gameMap.getComponent("MoveNode").playToHorizontal(!1);
this.showVignettte();
this.refreshTimes = this.maxRefreshTimes;
var e = conf.stage_level_cfg[this.worldId][this.level], t = conf.level_cfg[e.mapId];
this.moveHintController.resetAllWithSolution(t.sz_solution);
this.enterLevel(this.worldId, this.level);
1 == this.worldId && 6 == this.level && this.showHintTips();
var i = this;
transition.delayTo(this.node, {
delayTime: 6,
onComplete: function() {
i.showSkipLevel();
gamemain.playEffect(i.sfx_ui_bubble_show);
}
});
if ("false" == getLocalStorage("showAd")) {
this.removeAdBtn1.active = !1;
this.removeAdBtn2.active = !1;
} else {
this.removeAdBtn1.active = !0;
this.removeAdBtn2.active = !0;
}
},
showMenu: function() {
var e = cc.find("btnQuest", this.menu_list);
e.getComponent(cc.Button).interactable = !(1 == this.worldId && this.level < 10);
if (1 == this.worldId && this.level < 10) {
e.color = cc.color(125, 125, 125);
e.opacity = 125;
} else {
e.color = cc.color(255, 255, 255);
e.opacity = 255;
}
this.menu_list.runAction(cc.scaleTo(.02, 1, 1));
transition.fadeOut(this.btnMore, {
time: .2
});
transition.scaleTo(this.btnMore, {
time: .02,
scale: 0
});
},
hideMenu: function() {
if (0 != this.menu_list.scaleY) {
this.menu_list.runAction(cc.scaleTo(.02, 1, 0));
transition.fadeIn(this.btnMore, {
time: .2
});
transition.scaleTo(this.btnMore, {
time: .02,
scale: 1
});
}
},
showMenuTips: function() {
var e = this;
if (1 == this.worldId && (8 == this.level || 10 == this.level)) {
if (gamemain.getPassMaxLevelId(1) >= this.level) return;
this.menuTips.scaleY = 0;
var t = this.menuTips, i = cc.find("tips_label", t);
if (10 == this.level) {
t.position = cc.v2(t.position.x, 393);
i.getComponent("LocalizedLabel").dataID = "Lots of rewards!";
} else {
t.position = cc.v2(t.position.x, 289);
i.getComponent("LocalizedLabel").dataID = "New Face!";
}
transition.delayTo(this.node, {
delayTime: 1,
onComplete: function() {
e.showMenu();
t.active = !0;
transition.scaleTo(t, {
scaleY: 1,
time: .02
});
gamemain.playEffect(e.sfx_ui_bubble_show);
}
});
}
},
showSkipLevel: function() {
if (!(gamemain.getPassMaxLevelId(this.worldId) >= this.level || 1 == this.worldId && this.level < 11)) {
this.FreeHint.active = !0;
this.FreeHint.scale = 0;
var e = this.FreeHint;
e.scaleAction = function() {
transition.scaleTo(e, {
scale: 1.2,
time: .05,
onComplete: function(e) {
transition.scaleTo(e, {
scale: .8,
time: .05,
onComplete: function() {
transition.scaleTo(e, {
scale: 1.1,
time: .05,
onComplete: function(e) {
transition.scaleTo(e, {
scale: .95,
time: .05,
onComplete: function() {
transition.scaleTo(e, {
scale: 1,
time: .05,
onComplete: function() {
transition.delayTo(e, {
delayTime: 20,
onComplete: function() {
e.scaleAction();
}
});
}
});
}
});
}
});
}
});
}
});
};
e.scaleAction();
}
},
showSkipLevelWnd: function() {
var e = this;
gamemain.showTips({}, null, null, null, 1, null, function(t) {
t.height = 440;
e.SkipWnd = t;
cc.find("bg", t).height = 440;
cc.find("close", t).y = -150;
var i = cc.instantiate(e.SkipNode);
i.active = !0;
i.y = 10;
i.parent = t;
});
},
showVideoAdForSkipLevel: function(e) {
gamemain.showVideoAd(2, 2);
},
creatorOrder: function(e, t) {
gamemain.pay(t);
},
skipLevel: function() {
this.SkipWnd && gamemain.closeMenuItemAndBg(this.SkipWnd, .1, null, null, this.sfx_tran_popup_hide, this.sfx_ui_general_button);
gamemain.setSkipLevel(this.worldId, this.level);
this.nextLevel();
},
showQuestTick: function(e, t, i) {
var n = this;
if (e[t = t || 0]) {
var a = this.questBord, o = e[t], c = conf.quest_cfg[o], l = gamemain.getQuestInfo()[o];
cc.find("quest_name", a).getComponent("LocalizedLabel").dataID = c.sz_name;
cc.find("reaw_count", a).getComponent(cc.Label).string = c.reward;
var s = cc.find("quest_count", a).getComponent(cc.Label), r = cc.find("QuestProgressBar", a), h = cc.find("Quest_Completed", a);
h.active = !1;
var u = l.count - 1;
s.string = u + " / " + c.counter;
r.getComponent(cc.ProgressBar).progress = u / c.counter;
transition.moveBy(a, {
y: -a.height / 2,
time: .2,
onComplete: function(o) {
gamemain.playEffect(n.sfx_gend_quest_show);
u++;
r.getComponent("Progress").ProgressTo(10, u / c.counter, function(e) {
s.string = Math.floor(e * c.counter) + " / " + c.counter;
}, function() {
if (l.isCompleted) {
h.active = !0;
gamemain.playEffect(n.sfx_gend_quest_complete);
transition.scaleTo(h, {
time: .04,
scale: 1.1,
onComplete: function() {
transition.scaleTo(h, {
time: .04,
scale: 1,
onComplete: function() {
transition.delayTo(o, {
delayTime: 1,
onComplete: function(o) {
transition.moveBy(a, {
y: a.height / 2,
time: .2,
onComplete: function(a) {
n.showQuestTick(e, t + 1, i);
}
});
}
});
}
});
}
});
} else transition.delayTo(o, {
delayTime: 1,
onComplete: function(o) {
transition.moveBy(a, {
y: a.height / 2,
time: .2,
onComplete: function(a) {
n.showQuestTick(e, t + 1, i);
}
});
}
});
});
}
});
} else i && i();
},
showQuestList: function() {
this.hideMenu();
var e = cc.instantiate(this.QuestWind), t = e.getComponent("TipsWnd");
for (var i in conf.quest_cfg) {
var n = cc.instantiate(cc.find("questItem", t.content));
n.parent = t.content;
n.active = !0;
var a = conf.quest_cfg[i];
cc.find("quest_name", n).getComponent("LocalizedLabel").dataID = a.sz_name;
cc.find("reaw_count", n).getComponent(cc.Label).string = a.reward;
n.progressAction = function(e) {
var t = conf.quest_cfg[e], i = gamemain.getQuestInfo()[e], n = cc.find("quest_count", this).getComponent(cc.Label), a = cc.find("QuestProgressBar", this), o = cc.find("Quest_Completed", this);
o.active = !1;
var c = i.count;
n.string = "0 / " + t.counter;
a.getComponent(cc.ProgressBar).progress = 0;
a.getComponent("Progress").ProgressTo(30, c / t.counter, function(e) {
n.string = Math.floor(e * t.counter) + " / " + t.counter;
}, function() {
i.isCompleted && (o.active = !0);
});
};
n.progressAction(i);
}
var o = gamemain.getRunningScene();
gamemain.showWnd(o, e, {
havelistener: 1,
havecloseBtn: 0,
layer_num: 36
}, this.modalBoxPerfab);
},
showCompleteQuest: function(e, t) {
var i = 3, n = this.QuestComplete, a = cc.find("QuestComplete_label", n);
if (e) {
i = conf.quest_cfg[e].reward;
a.getComponent("LocalizedLabel").dataID = "Quest completed!";
} else a.getComponent("LocalizedLabel").dataID = "A little gift for you.";
cc.find("HintNum", n).getComponent(cc.Label).string = "+" + i;
a.opacity = 0;
var o = this, c = {
havelistener: 1,
havecloseBtn: 0,
layer_num: 36,
beginfun: function() {
transition.fadeIn(a, {
time: 1
});
var e = n.getComponent("MoveNode");
if (e) {
e.addFinishFirstCallback(function() {
gamemain.playEffect(o.sfx_tran_popup_show);
});
e.play();
}
},
close_callback: function() {
t && t();
}
};
this.QuestComplete.removeFromParent(!1);
var l = gamemain.getRunningScene();
gamemain.showWnd(l, this.QuestComplete, c, this.modalBoxPerfab);
},
showUnlockWorld: function(e) {
this.newWorld = e;
var t = cc.instantiate(this.UnlockWorld), i = conf.theme_cfg[e];
setNodeColorForHSVA(cc.find("bg", t), i.list_unlock_background);
setNodeColorForHSVA(cc.find("bg/Lock/07_imgLockBody@2x", t), i.list_unlock_lock);
setNodeColorForHSVA(cc.find("bg/Lock/07_imgLockHand@2x", t), i.list_unlock_lock);
cc.find("btn_bg/World_id", t).getComponent(cc.Label).string = e;
var n = cc.find("bg/Lock", t), a = this, o = {
havelistener: 1,
havecloseBtn: 0,
layer_num: 36,
beginfun: function() {
t.getComponent("TipsWnd").cancelcallback = function() {
a.isGaming ? gamemain.hiddenNativeAd() : gamemain.showNativeAd();
};
var e = t.getComponent("MoveNode");
if (e) {
e.addFinishFirstCallback(function() {
gamemain.playEffect(a.sfx_gend_world_unlock);
transition.delayTo(n, {
delayTime: .3,
onComplete: function(e) {
gamemain.playEffect(a.sfx_gend_world_unlock_lock);
e.getComponent(cc.Animation).play();
}
});
});
e.play();
}
}
};
t.removeFromParent(!1);
gamemain.hiddenNativeAd();
var c = gamemain.getRunningScene();
gamemain.showWnd(c, t, o, this.modalBoxPerfab);
},
gotoNewWorld: function() {
gamemain.hiddenBannerAd();
gamemain.hiddenNativeAd();
if (this.newWorld) {
this.enterLevel(this.newWorld, 1);
this.showVignettte();
}
},
changeSankeFace: function(e) {
this.gameMap.getComponent("game_map").changeSankeFace(e);
},
showFacesList: function() {
this.hideMenu();
var e = this, t = cc.instantiate(this.FacesWnd), i = t.getComponent("TipsWnd").content;
i.height = 150 * Math.ceil(conf.face_cfg.length / 3);
for (var n in conf.face_cfg) {
var a = cc.instantiate(this.FacesItem);
a.getComponent("Face").initFaceWhiteWorldId(this.worldId, parseInt(n), !0);
a.parent = i;
a.scale = .6;
a.height = 180;
}
var o = {
havelistener: 1,
havecloseBtn: 0,
layer_num: 36,
beginfun: function() {
var e = t.getComponent("MoveNode");
if (e) {
e.addFinishFirstCallback(function() {});
e.play();
}
},
close_callback: function() {
e.changeSankeFace(gamemain.getFace());
}
};
t.getComponent("TipsWnd").cancelcallback = o.close_callback;
var c = gamemain.getRunningScene();
gamemain.showWnd(c, t, o, this.modalBoxPerfab);
},
showHintShopWnd: function() {
var e = cc.instantiate(this.HintShopWnd), t = e.getComponent("PopShop");
this.freeHintBtn = t.freeBtn;
var i = e.getComponent("TipsWnd");
e.playFreeEffect = function() {
setTimeout(function() {
t.freeBtn && t.freeBtn.getComponent("ScaleNode").play(function() {
e && e.playFreeEffect();
});
}, 5e3);
};
var n = {
havelistener: 1,
havecloseBtn: 0,
layer_num: 36,
beginfun: function() {
if (i) {
e.playFreeEffect();
i.show({
title: ""
});
i.cancelcallback = function() {
globalObj.stopFreeHintTimer();
globalObj.stopFreeTicketTimer();
};
}
},
close_callback: function() {
globalObj.stopFreeHintTimer();
globalObj.stopFreeTicketTimer();
}
};
i.playMoveAction();
globalObj.createFreeHintTimer();
var a = gamemain.getRunningScene();
gamemain.showWnd(a, e, n, this.modalBoxPerfab);
},
showTicketShopWnd: function() {
gamemain.hiddenNativeAd();
var e = this, t = cc.instantiate(this.TicketShopWnd), i = t.getComponent("PopShop");
this.freeTicketBtn = i.freeBtn;
var n = t.getComponent("TipsWnd");
t.playFreeEffect = function() {
setTimeout(function() {
i.freeBtn && i.freeBtn.getComponent("ScaleNode").play(function() {
t && t.playFreeEffect();
});
}, 5e3);
};
var a = {
havelistener: 1,
havecloseBtn: 0,
layer_num: 36,
beginfun: function() {
if (n) {
t.playFreeEffect();
n.show({
title: ""
});
n.cancelcallback = function() {
globalObj.stopFreeHintTimer();
globalObj.stopFreeTicketTimer();
e.isGaming ? gamemain.hiddenNativeAd() : gamemain.showNativeAd();
};
}
},
close_callback: function() {
globalObj.stopFreeHintTimer();
globalObj.stopFreeTicketTimer();
e.isGaming ? gamemain.hiddenNativeAd() : gamemain.showNativeAd();
}
};
n.playMoveAction();
globalObj.createFreeTicketTimer();
var o = gamemain.getRunningScene();
gamemain.showWnd(o, t, a, this.modalBoxPerfab);
},
showRemoveAdWnd: function() {
gamemain.hiddenNativeAd();
var e = this, t = cc.instantiate(this.RemoveAdWnd);
t.playFreeEffect = function() {};
var i = t.getComponent("TipsWnd"), n = {
havelistener: 1,
havecloseBtn: 0,
layer_num: 36,
beginfun: function() {
t.playFreeEffect();
i.show({
title: ""
});
i.cancelcallback = function() {
e.isGaming ? gamemain.hiddenNativeAd() : gamemain.showNativeAd();
};
},
close_callback: function() {
e.isGaming ? gamemain.hiddenNativeAd() : gamemain.showNativeAd();
}
};
i.playMoveAction();
var a = gamemain.getRunningScene();
gamemain.showWnd(a, t, n, this.modalBoxPerfab);
},
showWorldCompleted: function(e) {
var t = this, i = cc.instantiate(this.worldCompletedPerfab), n = i.getComponent("WorldCompleted");
n && n.show(e);
var a = {
havelistener: 1,
close_callback: function() {
t.isGaming || gamemain.showNativeAd();
}
};
gamemain.hiddenBannerAd();
gamemain.hiddenNativeAd();
var o = gamemain.getRunningScene();
gamemain.showWnd(o, i, a, this.modalBoxPerfab);
}
});
cc._RF.pop();
}, {} ],
game_map: [ function(e, t, i) {
"use strict";
cc._RF.push(t, "6f4cc6Uvm5DXZUagYmdmh8h", "game_map");
cc.Class({
extends: cc.Component,
properties: {
shadow_layer: {
default: null,
type: cc.Node,
tooltip: "阴影层"
},
fllor_space_layer: {
default: null,
type: cc.Node,
tooltip: "地砖层"
},
tile_item_layer: {
default: null,
type: cc.Node,
tooltip: "障碍物层"
},
spaceTile: {
default: null,
type: cc.Node,
tooltip: "空白方块"
},
SankeHead: {
default: null,
type: cc.Node,
tooltip: "蛇头"
},
Brick: {
default: null,
type: cc.Node,
tooltip: "砖"
},
Arrow: {
default: null,
type: cc.Node,
tooltip: "方向"
},
Lock: {
default: null,
type: cc.Node,
tooltip: "锁"
},
Key: {
default: null,
type: cc.Node,
tooltip: "钥匙"
},
Portal: {
default: null,
type: cc.Node,
tooltip: "传送门"
},
Prortal_out: {
default: null,
type: cc.Node,
tooltip: "传送门效果"
},
blockbreak: {
default: null,
type: cc.Prefab,
tooltip: "碎砖效果"
},
Tiles: {
default: [],
type: Array,
tooltip: "所有砖块"
},
Shadows: {
default: [],
type: Array,
tooltip: "所有阴影"
},
TileItems: {
default: [],
type: Array,
tooltip: "所有物品"
},
Sankes: {
default: [],
type: Array,
tooltip: "所有蛇"
},
Themes: {
default: [],
type: Array,
tooltip: "主题配置"
},
TileSize: {
default: cc.size(110, 110),
tooltip: "砖块大小"
},
MapSize: {
default: cc.size(1, 1),
tooltip: "地图大小"
},
worldId: {
default: 1,
type: cc.Integer,
tooltip: "世界ID"
},
mapId: {
default: 1,
type: cc.Integer,
tooltip: "地图ID"
},
Border: 20,
isLoadData: !1,
isHinting: !1,
sfx_gply_snake_hit_brick: {
default: null,
type: cc.AudioClip,
tooltip: "sfx_gend_world_complete"
},
sfx_gply_board_bounce: {
default: null,
type: cc.AudioClip,
tooltip: "sfx_gply_board_bounce"
},
sfx_gply_hint_use: {
default: null,
type: cc.AudioClip,
tooltip: "sfx_gply_hint_use"
},
sfx_gply_snake_move: {
default: null,
type: cc.AudioClip,
tooltip: "sfx_gply_snake_move"
},
sfx_gply_snake_move_fail: {
default: null,
type: cc.AudioClip,
tooltip: "sfx_gply_snake_move_fail"
},
sfx_gply_mech_portal_in: {
default: null,
type: cc.AudioClip,
tooltip: "sfx_gply_mech_portal_in"
},
sfx_gply_mech_pass_arrow: {
default: null,
type: cc.AudioClip,
tooltip: "sfx_gply_mech_pass_arrow"
},
sfx_gply_mech_key_shine: {
default: null,
type: cc.AudioClip,
tooltip: "sfx_gply_mech_key_shine"
},
sfx_gply_mech_lock_unlock: {
default: null,
type: cc.AudioClip,
tooltip: "sfx_gply_mech_lock_unlock"
}
},
start: function() {},
loadLevel: function(e, t, i) {
this.worldId = e;
this.mapId = t;
this.clearAll();
var n = CloneJson(conf.all_Level[t]);
this.Themes = conf.theme_cfg[this.worldId];
if (n && n.length > 0) {
this.Level_data = n;
this.Level_item_data = CloneJson(n);
var a = cc.size(n[0].length, n.length);
this.MapSize = a;
this.setTiles(n);
this.addObstacle();
this.loadHintData(!0, i, 0);
this.node.position = cc.v2(0, 0);
}
},
hintGame: function(e, t, i, n, a) {
if (this.isHinting || this.isLoadData) return !1;
this.isHinting = !0;
var o = this;
i ? this.movePlayer(n, 0, function(e) {
o.isHinting = !1;
a && a(e);
}) : this.getMoveDirection(function(e) {
o.isHinting = !1;
a && a(e);
}, e, t);
return !0;
},
getMoveDirection: function(e, t, i) {
var n = conf.level_cfg[this.mapId], a = Math.ceil(n.sz_solution.length / 3);
a > i && (a = i);
for (var o = a + t, c = n.sz_solution.substring(t, o), l = 0, s = []; c[l]; ) {
var r = this.getDirection(c[l]);
s.push(r);
l++;
}
e && e(s);
},
movePlayer: function(e, t, i, n) {
if (e[t]) {
var a = this.getDirection(e[t]);
if (isNaN(a)) {
i && i(n);
return;
}
var o = this;
this.moveSanke(a, function(n) {
o.movePlayer(e, t + 1, function(e) {
i && i(e);
}, n);
});
} else i && i(n);
},
loadHintData: function(e, t, i) {
var n = conf.level_cfg[this.mapId], a = Math.ceil(n.sz_solution.length / 3), o = a * i, c = o - a, l = n.sz_solution.substring(e ? 0 : c, o);
this.isLoadData = e;
var s = this;
this.loadHintMap(l, 0, function(e) {
s.isLoadData = !1;
t && t(e);
});
},
loadHintMap: function(e, t, i, n) {
if (e[t]) {
var a = this.getDirection(e[t]), o = this;
this.moveSanke(a, function(n) {
o.loadHintMap(e, t + 1, function(e) {
i && i(e);
}, n);
});
} else i && i(n);
},
getDirection: function(e) {
switch (e) {
case "U":
return Direction.DirectionUp;

case "D":
return Direction.DirectionDown;

case "L":
return Direction.DirectionLeft;

case "R":
return Direction.DirectionRight;
}
},
getPositionByTile: function(e) {
var t = cc.size(this.MapSize.width * this.TileSize.width, this.MapSize.height * this.TileSize.height);
return cc.v2(e.x * this.TileSize.width - t.width / 2 + this.TileSize.width / 2, t.height / 2 - e.y * this.TileSize.height - this.TileSize.height / 2);
},
clearMapTiles: function() {
this.shadow_layer.removeAllChildren(!0);
this.fllor_space_layer.removeAllChildren(!0);
this.Shadows = [];
this.Tiles = [];
},
clearTileItems: function() {
this.tile_item_layer.removeAllChildren(!0);
this.TileItems = [];
this.Sankes = [];
},
clearAll: function() {
this.clearMapTiles();
this.clearTileItems();
},
setTiles: function(e) {
this.clearMapTiles();
for (var t in e) for (var i in e[t]) e[t][i] > 0 && this.addTileAt(cc.v2(parseInt(i), parseInt(t)));
},
addObstacle: function() {
for (var e in this.Level_data) for (var t in this.Level_data[e]) {
var i = this.Level_data[e][t], n = cc.v2(parseInt(t), parseInt(e));
i == tileType.kTileDataHead || i == tileType.kTileDataBody ? this.addSanke(n, i) : i != tileType.kTileDataDestroyable && i != tileType.kTileDataArrowUp && i != tileType.kTileDataArrowDown && i != tileType.kTileDataArrowLeft && i != tileType.kTileDataArrowRight && i != tileType.kTileDataLock && i != tileType.kTileDataKey && i != tileType.kTileDataPortal || this.addTileItem(n, i);
}
},
addTileItem: function(e, t) {
var i = this.getPositionByTile(e), n = cc.instantiate(this.spaceTile);
n.width = this.TileSize.width;
n.height = this.TileSize.height;
n.parent = this.tile_item_layer;
this.TileItems[e.y] = this.TileItems[e.y] || {};
this.TileItems[e.y][e.x] = n;
if (t == tileType.kTileDataDestroyable) {
var a = this.Themes.list_brick_tile;
setNodeColorForHSVA(n, a);
var o = cc.instantiate(this.Brick);
o.parent = n;
o.width = n.width - this.Border;
o.height = n.height - this.Border;
a = this.Themes.list_brick;
setNodeColorForHSVA(o, a);
i.y += this.Border;
} else if (t == tileType.kTileDataLock) {
a = this.Themes.list_lock;
setNodeColorForHSVA(n, a);
n.removeComponent(cc.Sprite);
var c = cc.instantiate(this.Lock);
c.parent = n;
c.width = n.width;
c.height = n.height;
i.y += this.Border;
} else if (t == tileType.kTileDataKey) {
a = this.Themes.list_key;
setNodeColorForHSVA(n, a);
var l = cc.instantiate(this.Key);
n.removeComponent(cc.Sprite);
l.parent = n;
l.scale = n.height / l.height;
} else if (t == tileType.kTileDataPortal) {
a = this.Themes.list_portal_tile;
setNodeColorForHSVA(n, a);
var s = cc.instantiate(this.Portal);
s.parent = n;
s.scale = n.height / s.height;
a = this.Themes.list_portal;
setNodeColorForHSVA(s, a);
} else if (t == tileType.kTileDataArrowUp || t == tileType.kTileDataArrowDown || t == tileType.kTileDataArrowLeft || t == tileType.kTileDataArrowRight) {
a = this.Themes.list_arrow_tile;
setNodeColorForHSVA(n, a);
var r = cc.instantiate(this.Arrow);
r.parent = n;
r.scale = n.height / r.height;
a = this.Themes.list_arrow;
setNodeColorForHSVA(r, a);
t == tileType.kTileDataArrowUp ? r.rotation = -90 : t == tileType.kTileDataArrowRight ? r.rotation = 0 : t == tileType.kTileDataArrowLeft ? r.rotation = 180 : t == tileType.kTileDataArrowDown && (r.rotation = 90);
}
n.position = i;
},
addSanke: function(e, t) {
var i = this.getPositionByTile(e), n = cc.instantiate(this.spaceTile);
n.width = this.TileSize.width;
n.height = this.TileSize.height + this.Border;
i.y += this.Border / 2;
n.parent = this.tile_item_layer;
n.position = i;
var a = this.Themes.list_character;
setNodeColorForHSVA(n, a);
this.Sankes[e.y] = this.Sankes[e.y] || {};
this.Sankes[e.y][e.x] = n;
if (t == tileType.kTileDataHead) {
n.Head = cc.instantiate(this.SankeHead);
n.Head.getComponent("Face").initFaceWhiteWorldId(this.worldId);
n.Head.parent = n;
n.Head.scale = n.width / this.SankeHead.width;
}
},
changeSankeFace: function(e) {
var t = this;
this.getSankeHead().forEach(function(i) {
var n = t.Sankes[i.y][i.x];
if (n.Head) {
var a = n.Head.getComponent("Face");
a && a.initFaceWhiteWorldId(t.worldId, e);
}
});
},
checkCrevice: function(e, t, i) {
if (i) {
this.Level_data[t.y + 1] && this.Level_data[t.y + 1][t.x] && this.Level_data[t.y + 1][t.x] == tileType.kTileDataBody && t.y + 1 != i.y && this.addCrevice(e, 2);
this.Level_data[t.y - 1] && this.Level_data[t.y - 1][t.x] && this.Level_data[t.y - 1][t.x] == tileType.kTileDataBody && t.y - 1 != i.y && this.addCrevice(e, 1);
this.Level_data[t.y][t.x + 1] && this.Level_data[t.y][t.x + 1] == tileType.kTileDataBody && t.x + 1 != i.x && this.addCrevice(e, -2);
this.Level_data[t.y][t.x - 1] && this.Level_data[t.y][t.x - 1] == tileType.kTileDataBody && t.x - 1 != i.x && this.addCrevice(e, -1);
}
this.Level_data[t.y + 1] && this.Level_data[t.y + 1][t.x] && this.Level_data[t.y + 1][t.x] == tileType.kTileDataHead && this.addCrevice(e, 2);
this.Level_data[t.y - 1] && this.Level_data[t.y - 1][t.x] && this.Level_data[t.y - 1][t.x] == tileType.kTileDataHead && this.addCrevice(e, 1);
this.Level_data[t.y][t.x + 1] && this.Level_data[t.y][t.x + 1] == tileType.kTileDataHead && this.addCrevice(e, -2);
this.Level_data[t.y][t.x - 1] && this.Level_data[t.y][t.x - 1] == tileType.kTileDataHead && this.addCrevice(e, -1);
},
addCrevice: function(e, t) {
var i = cc.instantiate(this.spaceTile), n = this.TileSize, a = Math.floor(this.Border / 3);
i.width = t > 0 ? n.width : a;
i.height = t < 0 ? e.height : a;
i.parent = e;
e.crevice = e.crevice || [];
e.crevice[e.crevice.length] = i;
i.position = t < 0 ? cc.v2(-1 == t ? -e.width / 2 + a : e.width / 2 + a, 0) : cc.v2(0, 1 == t ? e.height / 2 - a : -e.height / 2 - a);
i.active = !0;
var o = this.Themes.list_background;
setNodeColorForHSVA(i, o);
},
addTileAt: function(e) {
var t = this.getPositionByTile(e), i = cc.instantiate(this.spaceTile);
i.width = this.TileSize.width;
i.height = this.TileSize.height;
i.parent = this.fllor_space_layer;
i.position = t;
var n = this.Themes.list_floor;
setNodeColorForHSVA(i, n);
this.Tiles[e.y] = this.Tiles[e.y] || {};
this.Tiles[e.y][e.x] = i;
var a = cc.instantiate(this.spaceTile);
a.width = this.TileSize.width;
a.height = this.TileSize.height + this.Border;
a.parent = this.shadow_layer;
a.position = cc.v2(t.x, t.y + this.Border / 2);
n = this.Themes.list_shadow;
setNodeColorForHSVA(a, n);
this.Shadows[e.y] = this.Shadows[e.y] || {};
this.Shadows[e.y][e.x] = a;
},
removeTileAt: function(e) {
if (this.Tiles[e.y] && this.Tiles[e.y][e.x]) {
this.Tiles[e.y][e.x].removeFromParent(!0);
delete this.Tiles[e.y][e.x];
}
if (this.Shadows[e.y] && this.Shadows[e.y][e.x]) {
this.Shadows[e.y][e.x].removeFromParent(!0);
delete this.Shadows[e.y][e.x];
}
},
getSankeHead: function() {
var e = [];
for (var t in this.Level_data) for (var i in this.Level_data[t]) {
this.Level_data[t][i] == tileType.kTileDataHead && (e[e.length] = cc.v2(parseInt(i), parseInt(t)));
}
return e;
},
getStepArray: function(e, t) {
var i = [];
if (!this.checkArrow(t, e)) return i;
var n = this.getNextTile(e, t);
if (this.Level_data[n.y] && this.Level_data[n.y][n.x]) {
switch (this.Level_data[n.y][n.x]) {
case tileType.kTileDataSpace:
i[i.length] = n;
this.Level_data[n.y][n.x] = tileType.kTileDataBlock;
return i.concat(this.getStepArray(e, n));

case tileType.kTileDataArrowRight:
if (e != Direction.DirectionLeft) {
e = Direction.DirectionRight;
i[i.length] = n;
this.Level_data[n.y][n.x] = tileType.kTileDataBlock;
return i.concat(this.getStepArray(e, n));
}
break;

case tileType.kTileDataArrowLeft:
if (e != Direction.DirectionRight) {
e = Direction.DirectionLeft;
this.Level_data[n.y][n.x] = tileType.kTileDataBlock;
i[i.length] = n;
return i.concat(this.getStepArray(e, n));
}
break;

case tileType.kTileDataArrowUp:
if (e != Direction.DirectionDown) {
e = Direction.DirectionUp;
i[i.length] = n;
this.Level_data[n.y][n.x] = tileType.kTileDataBlock;
return i.concat(this.getStepArray(e, n));
}
break;

case tileType.kTileDataArrowDown:
if (e != Direction.DirectionUp) {
e = Direction.DirectionDown;
i[i.length] = n;
this.Level_data[n.y][n.x] = tileType.kTileDataBlock;
return i.concat(this.getStepArray(e, n));
}
break;

case tileType.kTileDataDestroyable:
break;

case tileType.kTileDataPortal:
i[i.length] = n;
this.Level_data[n.y][n.x] = tileType.kTileDataBlock;
n = this.getOutPortal(t);
this.Level_data[n.y][n.x] = tileType.kTileDataBlock;
i[i.length] = n;
var a = tileType.kTileDataPortD;
e == Direction.DirectionLeft ? a = tileType.kTileDataPortL : e == Direction.DirectionRight ? a = tileType.kTileDataPortR : e == Direction.DirectionUp && (a = tileType.kTileDataPortU);
this.Level_item_data[n.y][n.x] = a;
return i.concat(this.getStepArray(e, n));

case tileType.kTileDataKey:
i[i.length] = n;
this.Level_data[n.y][n.x] = tileType.kTileDataBlock;
this.unLock();
return i.concat(this.getStepArray(e, n));
}
}
return i;
},
getNextTile: function(e, t) {
var i;
e == Direction.DirectionUp ? i = cc.v2(t.x, t.y - 1) : e == Direction.DirectionDown ? i = cc.v2(t.x, t.y + 1) : e == Direction.DirectionLeft ? i = cc.v2(t.x - 1, t.y) : e == Direction.DirectionRight && (i = cc.v2(t.x + 1, t.y));
return i;
},
moveSanke: function(e, t) {
var i = this.getSankeHead(), n = [], a = 0, o = 0, c = 0;
for (var l in i) {
var s = i[l], r = this.getStepArray(e, s);
n[n.length] = r;
a += r.length;
o++;
}
var h = this;
for (var l in i) {
s = i[l], r = n[l];
this.moveSankeByStepArray(s, r, 0, e, function(e, i) {
c++;
var n = h.Sankes[e.y][e.x];
i = h.checkTileItem(e, n, i, r.length);
var l = h.getNextTile(i, e);
if (h.Level_data[l.y] && h.Level_data[l.y][l.x] && h.Level_data[l.y][l.x] == tileType.kTileDataDestroyable) {
h.TileItems[l.y][l.x].removeFromParent(!0);
h.addTileAt(l);
h.Level_data[l.y][l.x] = tileType.kTileDataSpace;
if (!h.isLoadData) {
gamemain.playEffect(h.sfx_gply_snake_hit_brick);
var s = cc.instantiate(h.blockbreak);
s.parent = h.node;
s.position = h.TileItems[l.y][l.x].position;
try {
var u = s.getComponent(cc.ParticleSystem), d = h.Themes.list_brick;
u.startColor = getColorForHSVA(d);
u.startColorVar = cc.color(0, 0, 0);
u.endColor = getColorForHSVA(d);
u.endColorVar = cc.color(0, 0, 0);
u.resetSystem();
} catch (e) {}
}
a++;
}
if (c != o || h.isLoadData) h.isLoadData && t && t(); else {
var p = a;
if (h.checkClearSatge()) {
p = "complete";
gamemain.playEffect(h.sfx_gply_board_bounce);
} else if (a > 0) {
var m = h.isHinting ? h.sfx_gply_hint_use : h.sfx_gply_snake_move;
gamemain.playEffect(m);
} else gamemain.playEffect(h.sfx_gply_snake_move_fail);
h.shakeMap(i, p);
t && t(p);
}
});
}
},
shakeMap: function(e, t) {
if ("complete" != t) {
var i = this.node, n = [ 0, 0, 0 ], a = [ 0, 0, 0 ];
e == Direction.DirectionUp ? a = [ 5, -10, 5 ] : e == Direction.DirectionDown ? a = [ -5, 10, -5 ] : e == Direction.DirectionLeft ? n = [ -5, 10, -5 ] : e == Direction.DirectionRight && (n = [ 5, -10, 5 ]);
if (0 == t) {
n[0] = -n[1];
delete n[2];
a[0] = -a[1];
delete a[2];
}
transition.moveBy(i, {
time: .05,
x: n[0],
y: a[0],
onComplete: function(e) {
transition.moveBy(e, {
time: .025,
x: n[1],
y: a[1],
onComplete: function(e) {
a[2] && a[2] && transition.moveBy(e, {
time: .025,
x: n[2],
y: a[2]
});
}
});
}
});
}
0 != t && gamemain.Vibration(.03);
},
moveSankeByStepArray: function(e, t, i, n, a) {
if (t.length > 0) {
var o = this, c = this.isLoadData ? 0 : .05 / t.length, l = this.Sankes[e.y][e.x], s = t[i];
this.addSanke(e, tileType.kTileDataBody);
var r = this.Sankes[e.y][e.x];
if (l.crevice) {
l.crevice.forEach(function(e) {
e.parent = r;
r.crevice = r.crevice || [];
r.crevice[r.crevice.length] = e;
});
l.crevice = null;
}
if (l.Prortal_out) {
l.Prortal_out.removeFromParent(!0);
l.Prortal_out = null;
}
l.zIndex = 99;
n = this.checkTileItem(e, r, n);
this.Level_data[s.y][s.x] = tileType.kTileDataHead;
this.Level_data[e.y][e.x] = tileType.kTileDataBody;
this.Sankes[s.y] = this.Sankes[s.y] || {};
this.Sankes[s.y][s.x] = l;
this.checkCrevice(l, s, e);
var h = this.Level_item_data[s.y][s.x];
if (h == tileType.kTileDataPortal || h == tileType.kTileDataPortU || h == tileType.kTileDataPortD || h == tileType.kTileDataPortL || h == tileType.kTileDataPortR) {
c = 0;
this.isLoadData || gamemain.playEffect(o.sfx_gply_mech_portal_in);
}
var u = cc.v2((e.x - s.x) * this.TileSize.width, (e.y - s.y) * this.TileSize.height);
if (c > 0) transition.moveBy(l, {
x: -u.x / 2,
y: u.y / 2,
time: c,
onComplete: function() {
i < t.length - 1 ? o.moveSankeByStepArray(s, t, i + 1, n, a) : a && a(s, n);
}
}); else {
(u = this.getPositionByTile(s)).y += this.Border / 2;
l.position = u;
i < t.length - 1 ? o.moveSankeByStepArray(s, t, i + 1, n, a) : a && a(s, n);
}
} else a && a(e, n);
},
checkTileItem: function(e, t, i, n) {
var a = this.Level_item_data[e.y][e.x];
if (a == tileType.kTileDataPortal || a == tileType.kTileDataPortU || a == tileType.kTileDataPortD || a == tileType.kTileDataPortL || a == tileType.kTileDataPortR) {
var o = cc.instantiate(this.Prortal_out);
o.width = t.width;
o.scale = t.height / o.height;
o.parent = t;
i == Direction.DirectionUp ? o.rotation = 180 : i == Direction.DirectionLeft ? o.rotation = 90 : i == Direction.DirectionRight && (o.rotation = -90);
a == tileType.kTileDataPortU ? o.rotation = -180 : a == tileType.kTileDataPortD ? o.rotation = 180 : a == tileType.kTileDataPortL ? o.rotation = -90 : a == tileType.kTileDataPortR && (o.rotation = 90);
var c = this.TileItems[e.y][e.x];
if (c) {
c.removeFromParent(!0);
this.TileItems[e.y][e.x] = null;
}
} else if (a == tileType.kTileDataArrowUp) {
i = Direction.DirectionUp;
if (l = this.TileItems[e.y][e.x]) {
l.removeFromParent(!0);
this.TileItems[e.y][e.x] = null;
}
n && !this.isLoadData && gamemain.playEffect(this.sfx_gply_mech_pass_arrow);
} else if (a == tileType.kTileDataArrowDown) {
i = Direction.DirectionDown;
if (l = this.TileItems[e.y][e.x]) {
l.removeFromParent(!0);
this.TileItems[e.y][e.x] = null;
}
n && !this.isLoadData && gamemain.playEffect(this.sfx_gply_mech_pass_arrow);
} else if (a == tileType.kTileDataArrowLeft) {
i = Direction.DirectionLeft;
if (l = this.TileItems[e.y][e.x]) {
l.removeFromParent(!0);
this.TileItems[e.y][e.x] = null;
}
n && !this.isLoadData && gamemain.playEffect(this.sfx_gply_mech_pass_arrow);
} else if (a == tileType.kTileDataArrowRight) {
i = Direction.DirectionRight;
var l;
if (l = this.TileItems[e.y][e.x]) {
l.removeFromParent(!0);
this.TileItems[e.y][e.x] = null;
}
n && !this.isLoadData && gamemain.playEffect(this.sfx_gply_mech_pass_arrow);
} else if (a == tileType.kTileDataKey) {
this.isLoadData || gamemain.playEffect(this.sfx_gply_mech_key_shine);
var s = this.TileItems[e.y][e.x];
this.TileItems[e.y][e.x] = null;
transition.scaleTo(s, {
scale: 3,
time: .4
});
transition.fadeOut(s, {
time: .4,
onComplete: function() {
s.removeFromParent(!0);
}
});
this.Level_item_data[e.y][e.x] = tileType.kTileDataSpace;
this.unLock(1);
}
return i;
},
unLock: function(e) {
if (this.isAllKey()) {
for (var t in this.Level_data) {
t = parseInt(t);
for (var i in this.Level_data[t]) this.Level_data[t][i] == tileType.kTileDataLock && (this.Level_data[t][i] = tileType.kTileDataSpace);
}
if (e) {
this.isLoadData || gamemain.playEffect(this.sfx_gply_mech_lock_unlock);
for (var t in this.Level_item_data) {
t = parseInt(t);
for (var i in this.Level_item_data[t]) if (this.Level_item_data[t][i] == tileType.kTileDataLock) {
this.Level_item_data[t][i] = tileType.kTileDataSpace;
var n = this.TileItems[t][i];
this.TileItems[t][i] = null;
this.addTileAt(cc.v2(parseInt(i), t));
transition.scaleTo(n, {
scale: .8,
time: .05,
onComplete: function(e) {
transition.scaleTo(e, {
scale: 1.1,
time: .2
});
transition.fadeOut(e, {
time: .2,
onComplete: function(e) {
e.removeFromParent(!0);
}
});
}
});
}
}
}
}
},
isAllKey: function() {
for (var e in this.Level_data) for (var t in this.Level_data[e]) if (this.Level_data[e][t] == tileType.kTileDataKey) return !1;
return !0;
},
getOutPortal: function(e) {
for (var t in this.Level_data) for (var i in this.Level_data[t]) if (this.Level_data[t][i] == tileType.kTileDataPortal && (i != e.x || t != e.y)) return cc.v2(parseInt(i), parseInt(t));
return e;
},
checkArrow: function(e, t) {
return this.Level_item_data[e.y][e.x] == tileType.kTileDataArrowUp ? t == Direction.DirectionUp : this.Level_item_data[e.y][e.x] == tileType.kTileDataArrowDown ? t == Direction.DirectionDown : this.Level_item_data[e.y][e.x] == tileType.kTileDataArrowLeft ? t == Direction.DirectionLeft : this.Level_item_data[e.y][e.x] == tileType.kTileDataArrowRight ? t == Direction.DirectionRight : this.Level_item_data[e.y][e.x] == tileType.kTileDataPortD ? t != Direction.DirectionUp : this.Level_item_data[e.y][e.x] == tileType.kTileDataPortU ? t != Direction.DirectionDown : this.Level_item_data[e.y][e.x] == tileType.kTileDataPortR ? t != Direction.DirectionLeft : this.Level_item_data[e.y][e.x] != tileType.kTileDataPortL || t != Direction.DirectionRight;
},
checkClearSatge: function() {
for (var e in this.Level_data) for (var t in this.Level_data[e]) if (this.Level_data[e][t] != tileType.kTileDataBody && this.Level_data[e][t] != tileType.kTileDataHead && this.Level_data[e][t] != tileType.kTileDataBlock) return !1;
return !0;
}
});
cc._RF.pop();
}, {} ],
gamemain: [ function(e, t, i) {
"use strict";
cc._RF.push(t, "a1786RZg7xJQJOX1sjijm0A", "gamemain");
window.gamemain = {
m_passInfo: {},
m_stageLayer: {},
m_stageViewOffsetList: {},
m_quest_info: {},
showTabBarViewIndex: 2,
getGameSoundFileName: function(e) {
var t = String.format("{0}{1}.mp3", "resources/SoundPack_v1.2.1/", e);
return cc.url.raw(t);
},
playEffect: function(e) {
var t = gamemain.getEffectSoundSound();
cc.audioEngine.play(e, !1, parseFloat(t));
},
enterEnterGameScene: function(e) {
if (null == gameScene) {
for (var t in gamemain.m_stageLayer) gamemain.m_stageViewOffsetList[t] = gamemain.m_stageLayer[t].getScrollOffset();
setLocalStorage("enter_levels_id", e);
cc.director.loadScene("gameScene", function() {});
}
},
enterAnimScene: function() {
cc.director.loadScene("AnimScene", function() {});
},
enterHallScene: function(e) {
void 0 == e && (e = 2);
gamemain.showTabBarViewIndex = e;
cc.director.loadScene("HallScene", function() {});
},
getLastWordId: function() {
var e = getLocalStorage("enter_levels_id");
e = e || 1;
return conf.level_cfg[parseInt(e)].wordId;
},
setGameLang: function(e) {
e = e || "en";
setLocalStorage("game_lang", e);
try {
jsb.reflection.callStaticMethod("org/cocos2dx/javascript/utils/JavascriptJavaBridge", "setGameLanguage", "(Ljava/lang/String;)V", e);
} catch (e) {}
},
getGameLang: function() {
var e = "en";
getLocalStorage("game_lang") ? e = getLocalStorage("game_lang") : gamemain.setGameLang();
return e;
},
savePassInfo: function() {
setLocalStorage("pass_info", JSON.stringify(gamemain.m_passInfo));
},
getPassInfo: function() {
var e = getLocalStorage("pass_info");
e = "" != e && null != e ? JSON.parse(e) : {};
gamemain.m_passInfo = e;
return e;
},
getPassLevelCount: function() {
var e = 0;
if (gamemain.m_passInfo) for (var t in gamemain.m_passInfo) if (gamemain.m_passInfo.hasOwnProperty(t) && gamemain.m_passInfo[t]) {
gamemain.m_passInfo[t].passMaxLevel && (e += gamemain.m_passInfo[t].passMaxLevel);
if (gamemain.m_passInfo[t].skipList) {
var i = gamemain.m_passInfo[t].skipList;
for (var n in i) i.hasOwnProperty(n) && i[n] && 1 == i[n] && (e -= 1);
}
}
return e;
},
getPassMaxLevelId: function(e) {
var t = 0;
gamemain.m_passInfo[e] && gamemain.m_passInfo[e].passMaxLevel && (t = gamemain.m_passInfo[e].passMaxLevel);
return t;
},
getSkipList: function(e) {
var t = {};
gamemain.m_passInfo[e] && gamemain.m_passInfo[e].skipList && (t = gamemain.m_passInfo[e].skipList);
return t;
},
setPassMaxLevel: function(e, t) {
gamemain.m_passInfo[e] || (gamemain.m_passInfo[e] = {});
if (!(gamemain.m_passInfo[e].passMaxLevel && gamemain.m_passInfo[e].passMaxLevel > t)) {
gamemain.m_passInfo[e].passMaxLevel = t;
gamemain.savePassInfo();
}
},
checkFinishAllLevel: function(e, t, i) {
var n = gamemain.m_passInfo[e];
return !!n && (!(n && null != n.skipList && n.skipList.length > 0) && (parseInt(t) >= parseInt(n.passMaxLevel) && !conf.stage_level_cfg[e][parseInt(t) + 1] || !(!i || conf.stage_level_cfg[e][parseInt(n.passMaxLevel) + 1])));
},
checkSkipLevel: function(e, t) {
return gamemain.m_passInfo[e] && gamemain.m_passInfo[e].skipList && 1 == gamemain.m_passInfo[e].skipList[t];
},
deleteSkipLevel: function(e, t) {
gamemain.m_passInfo[e] && gamemain.m_passInfo[e].skipList && 1 == gamemain.m_passInfo[e].skipList[t] && delete gamemain.m_passInfo[e].skipList[t];
gamemain.savePassInfo();
},
setSkipLevel: function(e, t) {
gamemain.m_passInfo[e] || (gamemain.m_passInfo[e] = {});
gamemain.m_passInfo[e].skipList || (gamemain.m_passInfo[e].skipList = {});
gamemain.m_passInfo[e].skipList[t] = 1;
gamemain.setPassMaxLevel(e, t);
},
setBackGroupSound: function(e) {
var t = getLocalStorage("bgsound_value");
t ? null == e && (e = parseFloat(t)) : null == e && (e = 1);
cc.audioEngine.setMusicVolume(parseInt(e));
setLocalStorage("bgsound_value", e);
},
getBackGroupSound: function() {
return parseFloat(getLocalStorage("bgsound_value")) || 0;
},
setEffectSoundSound: function(e) {
var t = getLocalStorage("effectSoundValue");
t ? null == e && (e = parseFloat(t)) : null == e && (e = .9);
cc.audioEngine.setEffectsVolume(e);
setLocalStorage("effectSoundValue", e);
gamemain.setBackGroupSound();
},
getEffectSoundSound: function() {
return parseFloat(getLocalStorage("effectSoundValue")) || 0;
},
setVibration: function(e) {
null != (e = null == e ? getLocalStorage("game_vibration") : e) && "" != e || (e = 1);
gamemain.vibration = e;
setLocalStorage("game_vibration", e);
},
getVibration: function() {
var e = parseInt(getLocalStorage("game_vibration")) || 0;
gamemain.vibration = e;
return e;
},
Vibration: function(e) {
e = e || .1;
if (0 != gamemain.getVibration()) try {
return jsb.reflection.callStaticMethod("org/cocos2dx/javascript/utils/JavascriptJavaBridge", "vibrate", "(F)V", Number(e));
} catch (e) {}
},
getHintCount: function() {
return parseInt(getLocalStorage("hintCount")) || 0;
},
addHintCount: function(e) {
var t = gamemain.getHintCount() + e;
setLocalStorage("hintCount", t);
},
addAndShowHitCount: function(e, t) {
gamemain.addHintCount(e);
if (t) {
setLocalStorage("lookFreeHintVideoTime", new Date().getTime() + 18e4);
globalObj && globalObj.createFreeHintTimer();
}
var i = gamemain.getHintCount();
try {
null != hallScene && hallScene.updateHint();
} catch (e) {}
try {
null != gameScene && gameScene.updateHint();
} catch (e) {}
cc.loader.loadRes("perfab/HitCountWnd", cc.Prefab, function(t, n) {
if (n) {
var a = cc.instantiate(n), o = cc.find("HintNum", a);
o && (o.getComponent(cc.Label).string = "+" + e);
a.on("touchend", function() {
a.removeFromParent();
a.destroy();
});
var c = gamemain.getRunningScene();
if (null != c) {
c.addChild(a);
c.hasOwnProperty("HintCount") && (c.HintCount.getComponent(cc.Label).string = i);
}
}
});
},
getQuestInfo: function() {
var e = getLocalStorage("quest_info");
if (null == e) {
gamemain.checkQuest(0);
e = gamemain.m_quest_info;
} else e = JSON.parse(e);
gamemain.m_quest_info = e;
return e;
},
saveQuestInfo: function() {
setLocalStorage("quest_info", JSON.stringify(gamemain.m_quest_info));
},
checkQuest: function(e) {
var t = [];
for (var i in conf.quest_cfg) if (conf.quest_cfg.hasOwnProperty(i)) {
var n = conf.quest_cfg[i];
gamemain.m_quest_info[i] || (gamemain.m_quest_info[i] = {
isCompleted: !1,
count: 0
});
if (e >= n.world) {
if (!gamemain.m_quest_info[i].isCompleted && ("world" == n.sz_type && e == n.world || "world" != n.sz_type)) {
gamemain.m_quest_info[i].count++;
t[t.length] = i;
}
if (gamemain.m_quest_info[i].count == n.counter && !gamemain.m_quest_info[i].isCompleted) {
gamemain.m_quest_info[i].isCompleted = !0;
gamemain.addHintCount(n.reward);
}
}
}
gamemain.saveQuestInfo();
return t;
},
showWnd: function(e, t, i, n) {
cc.instantiate(n).getComponent("ModalBox").showWnd(e, t, i);
},
showTips: function(e, t, i, n, a, o, c) {
var l = "TipsWnd";
e && e.isTowType && (l = "Tips2Wnd");
var s = {};
cc.loader.loadRes("perfab/" + l, function(r, h) {
if (r) cc.error(r); else {
var u = cc.instantiate(h);
s.window = u;
var d = u.getComponent("TipsWnd");
c && c(u);
d.show(e, t, i, n, a, o);
cc.loader.releaseRes("perfab/" + l);
}
});
return s;
},
closeMenuItemAndBg: function(e, t, i, n, a, o) {
if (null != e) {
n ? gamemain.playEffect(o) : gamemain.playEffect(a);
var c = e.menuItem;
if (0 == (t = null != t ? t : .2)) {
c && c.removeFromParent(!0);
e.removeFromParent(!1);
c = null;
e = null;
} else gamemain.showCloseAction(t, e, function() {
c && c.removeFromParent(!0);
e.active = !1;
i && e.destroy();
c = null;
e = null;
});
}
},
showCloseAction: function(e, t, i) {
var n = t.getContentSize().height;
transition.moveBy(t, {
time: e / 2,
y: -n,
onComplete: function() {
transition.fadeOut(t, {
time: e / 2,
onComplete: function() {
i && i();
}
});
}
});
},
getRunningScene: function() {
return cc.find("Canvas");
},
checkNewWorld: function() {
var e = gamemain.getPassLevelCount();
for (var t in conf.worlds) if (conf.worlds.hasOwnProperty(t) && conf.worlds[t].require - e == 0) return t;
},
getFace: function() {
var e = getLocalStorage("face");
if (null == e) {
gamemain.setFace(0);
e = 0;
}
return e = parseInt(e);
},
setFace: function(e) {
null != e && parseInt(e) >= 0 && parseInt(e) <= 11 && setLocalStorage("face", e);
},
getFaceInfo: function() {
var e = getLocalStorage("face_info");
if (e) e = JSON.parse(e); else {
e = [];
for (var t in conf.face_cfg) conf.face_cfg.hasOwnProperty(t) && 1 == conf.face_cfg[t].isDefaultUnlock && (e[e.length] = parseInt(t));
gamemain.setFaceInfo(e);
}
return e;
},
setFaceInfo: function(e) {
e = e || [];
setLocalStorage("face_info", JSON.stringify(e));
},
checkFaceUnLock: function(e, t) {
var i = gamemain.getFaceInfo();
for (var n in conf.face_cfg) if (conf.face_cfg.hasOwnProperty(n)) {
var a = conf.face_cfg[n];
if (0 == a.unlockType && a.unlockWorldId == e) {
if (!isInArray(i, n) && gamemain.checkFinishAllLevel(e, t)) return parseInt(n);
} else if (1 == a.unlockType && 1 == e && 7 == t && !isInArray(i, n)) return parseInt(n);
}
},
onPayCallback: function(e) {
if (0 == e) gamemain.addAndShowHitCount(5, !1); else if (1 == e) gamemain.addAndShowHitCount(20, !1); else {
if (2 == e) {
setLocalStorage("showAd", "false");
try {
null != shop && shop.setRemoveAdItem();
} catch (e) {}
try {
null != gameScene && gameScene.setRemoveAdItem();
} catch (e) {}
return;
}
if (3 == e) {
gamemain.setInfinityTicketExpiryTime(24, !1);
return;
}
}
try {
null != hallScene && hallScene.updateHint();
} catch (e) {}
try {
null != gameScene && gameScene.updateHint();
} catch (e) {}
},
unlockFaceByVideo: function(e) {
var t = conf.face_cfg[e];
if (2 == t.unlockType) {
var i = t.unlockVideoCount;
i = parseInt(i);
var n = getLocalStorage("watch_video_times_with_face_id_" + e) || 0;
n = parseInt(n);
if ((n += 1) < i) {
setLocalStorage("watch_video_times_with_face_id_" + e, n);
gamemain.hasOwnProperty("faceComponent") && gamemain.faceComponent && gamemain.faceComponent.updateFaceUI();
gamemain.faceComponent = null;
} else {
setLocalStorage("watch_video_times_with_face_id_" + e, i);
gamemain.unlockFace(e);
}
}
},
unlockFace: function(e) {
var t = null;
gamemain.hasOwnProperty("unlockFaceSound") && gamemain.unlockFaceSound && (t = gamemain.unlockFaceSound);
var i = gamemain.getLastWordId(), n = gamemain.getFaceInfo();
n[n.length] = e;
gamemain.setFaceInfo(n);
gamemain.showFaceUnlock(e, i, !0, function() {
gamemain.setFace(e);
gamemain.hasOwnProperty("faceComponent") && gamemain.faceComponent && gamemain.faceComponent.updateFaceUI();
gamemain.faceComponent = null;
}, t, function() {
gamemain.hasOwnProperty("faceComponent") && gamemain.faceComponent && gamemain.faceComponent.updateFaceUI();
gamemain.faceComponent = null;
});
gamemain.unlockFaceSound = null;
},
showFaceUnlock: function(e, t, i, n, a, o) {
var c = !0, l = "Use", s = "OK", r = "";
if (!i) {
var h = conf.face_cfg[e];
if (0 == h.unlockType) {
c = !1;
s = "Later";
r = String.format(i18nPlug.t("Complete World {0} to unlock."), h.unlockWorldId);
} else if (2 == h.unlockType) {
s = "Later";
l = "Watch Now";
r = String.format(i18nPlug.t("Watch {0} Ads to unlock."), h.unlockVideoCount);
n = function() {
gamemain.unlockFaceSound = a;
gamemain.showVideoAd(4, e);
};
} else if (3 == h.unlockType) {
s = "Later";
l = "Like!";
r = i18nPlug.t("Like our Facebook to unlock.");
n = function() {
cc.sys.openURL("https://www.facebook.com/umbrellafun/");
gamemain.unlockFaceSound = a;
gamemain.unlockFace(e);
};
} else if (4 == h.unlockType) {
c = !1;
s = "Later";
r = i18nPlug.t("Come back later to Unlock");
}
}
gamemain.showTips({
isTowType: !0,
isTwo: c,
okLocalizedId: l,
cancelLocalizedId: s,
sound: i ? a : null
}, null, n, o, 1, null, function(n) {
cc.loader.loadRes("perfab/FaceUnlocked", function(a, o) {
if (a) cc.error(a); else {
var c = cc.instantiate(o), l = cc.find("face/Face", c).getComponent("Face");
l.initFaceWhiteWorldId(t, e, !0);
l.checkbock.active = !1;
c.parent = n;
var s = c.getChildByName("tips");
s.active = i;
s.getChildByName("face_id").getChildByName("id").getComponent(cc.Label).string = e;
if (!i) {
c.getChildByName("unLock_Tips").getComponent(cc.Label).string = r;
}
cc.loader.releaseRes("perfab/FaceUnlocked");
}
});
});
},
getTicketRecoveryInterval: function() {
return 3e5;
},
getTicketMaxNum: function() {
return 10;
},
getLookAdIntervalForFreeInfinityTicket: function() {
return 36e5;
},
getTicketCount: function() {
var e = parseInt(getLocalStorage("ticketCount")) || 0;
if (e >= gamemain.getTicketMaxNum()) return e;
if (0 == (parseInt(getLocalStorage("nextTicketRecoveryTime")) || 0) && 0 == e) {
e = gamemain.getTicketMaxNum();
setLocalStorage("ticketCount", e);
setLocalStorage("nextTicketRecoveryTime", new Date().getTime());
}
return e;
},
addTicketCount: function(e, t) {
if (0 != (e = Number(e))) {
var i = new Date().getTime(), n = parseInt(getLocalStorage("ticketCount")) || 0;
if (e < 0) {
if (gamemain.getInfinityTicketExpiryTime() > i) return;
if (n <= 0) return;
n += e;
} else if (e > 0) {
if (t) {
setLocalStorage("lookFreeTicketVideoTime", new Date().getTime() + gamemain.getLookAdIntervalForFreeInfinityTicket());
globalObj && globalObj.createFreeTicketTimer();
}
if (n >= gamemain.getTicketMaxNum()) return;
(n += e) > gamemain.getTicketMaxNum() && (n = gamemain.getTicketMaxNum());
}
setLocalStorage("ticketCount", n);
window.hasOwnProperty("hallScene") && hallScene && hallScene.updateTicket();
window.hasOwnProperty("gameScene") && gameScene && gameScene.updateTicket();
if (e < 0 && n - e >= gamemain.getTicketMaxNum()) {
setLocalStorage("nextTicketRecoveryTime", i + gamemain.getTicketRecoveryInterval());
globalObj && globalObj.createTicketRecoveryTimer();
}
}
},
setTicketCount: function(e) {
e = Number(e);
setLocalStorage("ticketCount", e);
},
getInfinityTicketExpiryTime: function() {
return parseInt(getLocalStorage("infinityTicketExpiryTime")) || 0;
},
setInfinityTicketExpiryTime: function(e, t) {
var i = parseInt(getLocalStorage("infinityTicketExpiryTime")) || 0, n = new Date().getTime();
i < n && (i = n);
i += 60 * e * 60 * 1e3;
setLocalStorage("infinityTicketExpiryTime", i);
globalObj && globalObj.createInfinityTicketTimer();
if (t) {
setLocalStorage("lookFreeTicketVideoTime", new Date().getTime() + gamemain.getLookAdIntervalForFreeInfinityTicket());
globalObj && globalObj.createFreeTicketTimer();
}
cc.loader.loadRes("perfab/TicketCountWnd", cc.Prefab, function(t, i) {
if (i) {
var n = cc.instantiate(i), a = cc.find("HintNum", n);
a && (a.getComponent(cc.Label).string = "+" + e + "H");
n.on("touchend", function() {
n.removeFromParent();
n.destroy();
});
var o = gamemain.getRunningScene();
null != o && o.addChild(n);
}
});
},
ticketIsEnough: function() {
return gamemain.getInfinityTicketExpiryTime() > new Date().getTime() || gamemain.getTicketCount() > 0;
},
showBannerAd: function() {
try {
if ("false" == getLocalStorage("showAd")) return;
jsb.reflection.callStaticMethod("org/cocos2dx/javascript/utils/JavascriptJavaBridge", "hiddenNativeAd", "()V");
jsb.reflection.callStaticMethod("org/cocos2dx/javascript/utils/JavascriptJavaBridge", "showBannerAd", "()V");
} catch (e) {}
},
hiddenBannerAd: function() {
try {
jsb.reflection.callStaticMethod("org/cocos2dx/javascript/utils/JavascriptJavaBridge", "hiddenBannerAd", "()V");
} catch (e) {}
},
showNativeAd: function() {
try {
if (gamemain.popViewCount > 0) return;
jsb.reflection.callStaticMethod("org/cocos2dx/javascript/utils/JavascriptJavaBridge", "hiddenBannerAd", "()V");
if ("false" == getLocalStorage("showAd")) return;
jsb.reflection.callStaticMethod("org/cocos2dx/javascript/utils/JavascriptJavaBridge", "showNativeAd", "()V");
} catch (e) {}
},
hiddenNativeAd: function() {
try {
jsb.reflection.callStaticMethod("org/cocos2dx/javascript/utils/JavascriptJavaBridge", "hiddenNativeAd", "()V");
} catch (e) {}
},
showInterstitialAd: function() {
try {
if ("false" == getLocalStorage("showAd")) return;
jsb.reflection.callStaticMethod("org/cocos2dx/javascript/utils/JavascriptJavaBridge", "showInterstitialAd", "()V");
} catch (e) {}
},
showVideoAd: function(e, t) {
try {
e = Number(e);
t = Number(t);
if (1 == e) {
var i = (parseInt(getLocalStorage("lookFreeHintVideoTime")) || 0) - new Date().getTime();
if ((i = parseInt(i / 1e3)) > 0) return;
} else if (2 == e) ; else if (3 == e) {
var n = (parseInt(getLocalStorage("lookFreeTicketVideoTime")) || 0) - new Date().getTime();
if ((n = parseInt(n / 1e3)) > 0) return;
}
jsb.reflection.callStaticMethod("org/cocos2dx/javascript/utils/JavascriptJavaBridge", "showVideoAd", "(II)V", e, t);
} catch (e) {}
},
checkIsGDPREnforcedCountry: function() {
try {
return jsb.reflection.callStaticMethod("org/cocos2dx/javascript/utils/JavascriptJavaBridge", "checkIsGDPREnforcedCountry", "()Z");
} catch (e) {}
return !1;
},
pay: function(e) {
try {
jsb.reflection.callStaticMethod("org/cocos2dx/javascript/utils/JavascriptJavaBridge", "pay", "(Ljava/lang/String;)V", e);
} catch (e) {}
},
showGameAlert: function(e, t, i, n, a, o) {
gamemain.showTips({
isTowType: !0,
isTwo: !0,
okLocalizedId: t,
cancelLocalizedId: i,
sound: null
}, null, a, o, 1, null, function(t) {
var i = cc.instantiate(e);
i.parent = t;
var a = i.getChildByName("tips");
a.active = !0;
a.getChildByName("content").getComponent("LocalizedLabel").dataID = n;
});
}
};
cc._RF.pop();
}, {} ],
"polyglot.min": [ function(e, t, i) {
"use strict";
cc._RF.push(t, "e26fd9yy65A4q3/JkpVnFYg", "polyglot.min");
var n = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(e) {
return typeof e;
} : function(e) {
return e && "function" == typeof Symbol && e.constructor === Symbol && e !== Symbol.prototype ? "symbol" : typeof e;
};
(function(e, a) {
"function" == typeof define && define.amd ? define([], function() {
return a(e);
}) : "object" == ("undefined" == typeof i ? "undefined" : n(i)) ? t.exports = a(e) : e.Polyglot = a(e);
})(void 0, function(e) {
function t(e) {
e = e || {}, this.phrases = {}, this.extend(e.phrases || {}), this.currentLocale = e.locale || "en", 
this.allowMissing = !!e.allowMissing, this.warn = e.warn || o;
}
function i(e, t, i) {
var n, o;
return null != i && e ? n = function(e) {
return e.replace(/^\s+|\s+$/g, "");
}((o = e.split(c))[a(t, i)] || o[0]) : n = e, n;
}
function a(e, t) {
return l[function(e) {
var t = function(e) {
var t, i, n, a = {};
for (t in e) if (e.hasOwnProperty(t)) {
i = e[t];
for (n in i) a[i[n]] = t;
}
return a;
}(s);
return t[e] || t.en;
}(e)](t);
}
function o(t) {
e.console && e.console.warn && e.console.warn("WARNING: " + t);
}
t.VERSION = "0.4.3", t.prototype.locale = function(e) {
return e && (this.currentLocale = e), this.currentLocale;
}, t.prototype.extend = function(e, t) {
var i;
for (var a in e) e.hasOwnProperty(a) && (i = e[a], t && (a = t + "." + a), "object" == ("undefined" == typeof i ? "undefined" : n(i)) ? this.extend(i, a) : this.phrases[a] = i);
}, t.prototype.clear = function() {
this.phrases = {};
}, t.prototype.replace = function(e) {
this.clear(), this.extend(e);
}, t.prototype.t = function(e, t) {
var n, a;
return "number" == typeof (t = null == t ? {} : t) && (t = {
smart_count: t
}), "string" == typeof this.phrases[e] ? n = this.phrases[e] : "string" == typeof t._ ? n = t._ : this.allowMissing ? n = e : (this.warn('Missing translation for key: "' + e + '"'), 
a = e), "string" == typeof n && (t = function(e) {
var t = {};
for (var i in e) t[i] = e[i];
return t;
}(t), a = function(e, t) {
for (var i in t) "_" !== i && t.hasOwnProperty(i) && (e = e.replace(new RegExp("%\\{" + i + "\\}", "g"), t[i]));
return e;
}(a = i(n, this.currentLocale, t.smart_count), t)), a;
}, t.prototype.has = function(e) {
return e in this.phrases;
};
var c = "||||", l = {
chinese: function(e) {
return 0;
},
german: function(e) {
return 1 !== e ? 1 : 0;
},
french: function(e) {
return e > 1 ? 1 : 0;
},
russian: function(e) {
return e % 10 == 1 && e % 100 != 11 ? 0 : e % 10 >= 2 && e % 10 <= 4 && (e % 100 < 10 || e % 100 >= 20) ? 1 : 2;
},
czech: function(e) {
return 1 === e ? 0 : e >= 2 && e <= 4 ? 1 : 2;
},
polish: function(e) {
return 1 === e ? 0 : e % 10 >= 2 && e % 10 <= 4 && (e % 100 < 10 || e % 100 >= 20) ? 1 : 2;
},
icelandic: function(e) {
return e % 10 != 1 || e % 100 == 11 ? 1 : 0;
}
}, s = {
chinese: [ "fa", "id", "ja", "ko", "lo", "ms", "th", "tr", "zh" ],
german: [ "da", "de", "en", "es", "fi", "el", "he", "hu", "it", "nl", "no", "pt", "sv" ],
french: [ "fr", "tl", "pt-br" ],
russian: [ "hr", "ru" ],
czech: [ "cs" ],
polish: [ "pl" ],
icelandic: [ "is" ]
};
return t;
});
cc._RF.pop();
}, {} ]
}, {}, [ "LanguageData", "LocalizedLabel", "LocalizedSprite", "SpriteFrameSet", "polyglot.min", "Aboutus", "CustomScrollView", "DontCollectData", "Face", "FaceView", "LevelButton", "LevelMask", "ModalBox", "MoveHintView", "MoveNode", "MoveNodeList", "NestablePageView_Outer", "NestableScrollView_Inner", "PopShop", "Progress", "QuestView", "RateUs", "ScaleNode", "Shop", "StageSelectLayer", "TabBarItem", "TabBarView", "TipsWnd", "UIButton", "WorldCompleted", "game_map", "GlobalObj", "gamemain", "AnimScene", "HallScene", "LaunchScene", "gameScene" ]);