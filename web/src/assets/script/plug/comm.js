window.getColorForHSVA = function(o) {
var r = new cc.Color();
r.fromHSV(o[0] / 360, o[1] / 100, o[2] / 100);
return r;
};

window.setNodeColorForHSVA = function(o, r) {
o.color = getColorForHSVA(r);
r[3] && (o.opacity = 255 * r[3]);
};

String.prototype.format = function(o) {
var r = this;
if (arguments.length > 0) if (1 == arguments.length && "object" == typeof o) {
for (var e in o) if (void 0 != o[e]) {
var t = new RegExp("({" + e + "})", "g");
r = r.replace(t, o[e]);
}
} else for (var n = 0; n < arguments.length; n++) if (void 0 != arguments[n]) {
t = new RegExp("({)" + n + "(})", "g");
r = r.replace(t, arguments[n]);
}
return r;
};

String.format = function(o) {
if (arguments.length > 1) {
var r = [];
for (var e in arguments) 0 != e && (r[")" + (e - 1) + "("] = arguments[e]);
return o.format(r);
}
return o;
};

window.setLocalStorage = function(o, r) {
r += "";
cc.sys.localStorage.setItem(compile(o), compile(r));
};

window.getLocalStorage = function(o) {
o = compile(o);
return cc.sys.localStorage.getItem(o) ? uncompile(cc.sys.localStorage.getItem(o)) : null;
};

window.removeLocalStorage = function(o) {
cc.sys.localStorage.removeItem(compile(o));
};

window.compile = function(o) {
for (var r = String.fromCharCode(o.charCodeAt(0) + o.length), e = 1; e < o.length; e++) r += String.fromCharCode(o.charCodeAt(e) + o.charCodeAt(e - 1));
return escape(r);
};

window.uncompile = function(o) {
o = unescape(o);
for (var r = String.fromCharCode(o.charCodeAt(0) - o.length), e = 1; e < o.length; e++) r += String.fromCharCode(o.charCodeAt(e) - r.charCodeAt(e - 1));
return r;
};

window.getRandomInRange = function(o, r) {
return Math.floor(100 * (Math.random() * (r - o + 1) + o)) / 100;
};

window.isInArray = function(o, r) {
for (var e = 0; e < o.length; e++) if (r === o[e]) return !0;
return !1;
};