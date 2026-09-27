transition = {};

ACTION_EASING = {};

ACTION_EASING.BACKIN = [ cc.easeBackIn, 1 ];

ACTION_EASING.BACKINOUT = [ cc.easeBackInOut, 1 ];

ACTION_EASING.BACKOUT = [ cc.easeBackOut, 1 ];

ACTION_EASING.BOUNCE = [ cc.easeBounce, 1 ];

ACTION_EASING.BOUNCEIN = [ cc.easeBounceIn, 1 ];

ACTION_EASING.BOUNCEINOUT = [ cc.easeBounceInOut, 1 ];

ACTION_EASING.BOUNCEOUT = [ cc.easeBounceOut, 1 ];

ACTION_EASING.ELASTIC = [ cc.easeElastic, 2, .3 ];

ACTION_EASING.ELASTICIN = [ cc.easeElasticIn, 2, .3 ];

ACTION_EASING.ELASTICINOUT = [ cc.easeElasticInOut, 2, .3 ];

ACTION_EASING.ELASTICOUT = [ cc.easeElasticOut, 2, .3 ];

ACTION_EASING.EXPONENTIALIN = [ cc.easeExponentialIn, 1 ];

ACTION_EASING.EXPONENTIALINOUT = [ cc.easeExponentialInOut, 1 ];

ACTION_EASING.EXPONENTIALOUT = [ cc.easeExponentialOut, 1 ];

ACTION_EASING.IN = [ cc.easeIn, 2, 1 ];

ACTION_EASING.INOUT = [ cc.easeInOut, 2, 1 ];

ACTION_EASING.OUT = [ cc.easeOut, 2, 1 ];

ACTION_EASING.RATEACTION = [ cc.easeRateAction, 2, 1 ];

ACTION_EASING.SINEIN = [ cc.easeSineIn, 1 ];

ACTION_EASING.SINEINOUT = [ cc.easeSineInOut, 1 ];

ACTION_EASING.SINEOUT = [ cc.easeSineOut, 1 ];

transition.newEasing = function(e, t, n) {
var i = t.toLocaleUpperCase();
"CCEASE" === i.slice(0, 6) && (i = i.slice(6));
if (ACTION_EASING[i]) {
var a = ACTION_EASING[i][0], o = ACTION_EASING[i][1], c = ACTION_EASING[i][2];
2 === o ? e.easing(a(n || c)) : e.easing(a());
}
};

transition.execute = function(e, t, n) {
n.easing && transition.newEasing(t, n.easing);
var i = [];
n.delay > 0 && (i[i.length] = cc.delayTime(n.delay));
i[i.length] = t;
var a = n.onComplete;
"function" != typeof a && (a = null);
null != a && (i[i.length] = cc.callFunc(a, e, null != n.data ? n.data : null));
if (i.length > 1) {
t = transition.sequence(i);
e.runAction(t);
} else e.runAction(i[0]);
return t;
};

transition.moveTo = function(e, t) {
var n = e.getPosition(), i = null != t.x || n.x, a = null != t.y || n.y, o = cc.moveTo(t.time, cc.v2(i, a));
return transition.execute(e, o, t);
};

transition.rotateTo = function(e, t) {
var n = e.rotation, i = t.rotation || n, a = cc.rotateTo(t.time, i);
return transition.execute(e, a, t);
};

transition.delayTo = function(e, t) {
var n = t.delayTime || 0, i = cc.delayTime(.5 * n);
return transition.execute(e, i, t);
};

transition.bezierTo = function(e, t) {
var n = cc.bezierTo(t.time, t.bezier);
return transition.execute(e, n, t);
};

transition.moveBy = function(e, t) {
var n = t.x || 0, i = t.y || 0, a = cc.moveBy(t.time, cc.v2(n, i));
return transition.execute(e, a, t);
};

transition.rotateBy = function(e, t) {
var n = e.rotation, i = t.rotation || n, a = cc.rotateBy(t.time, i);
return transition.execute(e, a, t);
};

transition.fadeIn = function(e, t) {
var n = cc.fadeIn(t.time);
e.opacity = 0;
return transition.execute(e, n, t);
};

transition.fadeOut = function(e, t) {
var n = cc.fadeOut(t.time);
e.opacity = 255;
return transition.execute(e, n, t);
};

transition.fadeTo = function(e, t) {
var n = Math.round(t.opacity);
n < 0 ? n = 0 : n > 255 && (n = 255);
var i = cc.fadeTo(t.time, n);
return transition.execute(e, i, t);
};

transition.scaleTo = function(e, t) {
var n;
if (null != t.scale) n = cc.scaleTo(t.time, t.scale); else if (null != t.scaleX || null != t.scaleY) {
var i, a;
i = null != t.scaleX ? t.scaleX : e.scaleX;
a = t.scaleY ? t.scaleY : e.scaleY;
n = cc.scaleTo(t.time, i, a);
}
return transition.execute(e, n, t);
};

transition.scaleBy = function(e, t) {
var n = t.scaleX || 0, i = t.scaleY || 0, a = cc.scaleTo(t.time, n, i);
return transition.execute(e, a, t);
};

transition.blinkTargetByFade = function(e, t, n, i) {
1 === i ? transition.fadeTo(e, {
time: t,
opacity: 255,
onComplete: function(e) {
transition.fadeTo(e, {
time: t,
opacity: 125,
onComplete: function(e) {
transition.delayTo(e, {
delayTime: n || 0,
onComplete: function(e) {
transition.blinkTargetByFade(e, t, n, i);
}
});
}
});
}
}) : 2 === i ? transition.fadeTo(e, {
time: t,
opacity: 125,
onComplete: function(e) {
transition.fadeTo(e, {
time: t,
opacity: 255,
onComplete: function(e) {
transition.delayTo(e, {
delayTime: n || 0,
onComplete: function(e) {
transition.blinkTargetByFade(e, t, n, i);
}
});
}
});
}
}) : 3 === i ? transition.fadeIn(e, {
time: t,
onComplete: function(e) {
transition.fadeOut(e, {
time: t,
onComplete: function(e) {
transition.blinkTargetByFade(e, t, n, i);
}
});
}
}) : transition.fadeIn(e, {
time: t,
onComplete: function(e) {
transition.fadeOut(e, {
time: t,
onComplete: function(e) {
transition.delayTo(e, {
delayTime: n || 0,
onComplete: function(e) {
transition.blinkTargetByFade(e, t, n, i);
}
});
}
});
}
});
};

transition.sequence = function(e) {
if (!(e.length < 1)) {
if (e.length < 2) return e[0];
for (var t = e[0], n = 0; n < e.length; n++) {
var i = e[n];
t = cc.sequence(t, i);
}
return t;
}
};

transition.removeAction = function(e) {
if (null != e) {
cc.director.getActionManager().removeAction(e);
}
};

transition.stopTarget = function(e) {
if (null != e) {
cc.director.getActionManager().removeAllActionsFromTarget(e);
}
};

transition.pauseTarget = function(e) {
if (null != e) {
cc.director.getActionManager().pauseTarget(e);
}
};

transition.resumeTarget = function(e) {
if (null != e) {
cc.director.getActionManager().resumeTarget(e);
}
};

transition.playActionByJson = function(e, t, n, i) {
var a = e.split("/"), o = a[a.length - 1], c = "res/animation/{0}/{1}.ExportJson".format(e, o), r = ccs.armatureDataManager;
r.removeArmatureFileInfo(c);
r.addArmatureFileInfo(c);
var s = ccs.Armature.create(o);
s.getAnimation().setMovementEventCallFunc(function(e, t, a) {
t == ccs.MovementEventType.complete && null != n && n(e, a);
t == ccs.MovementEventType.loopComplete && null != i && i(e, a);
});
s.getAnimation().play(t);
s.play = function(e, t) {
e.getAnimation().play(t);
};
return s;
};

transition.getParticleByPlist = function(e, t) {
var n = new cc.ParticleSystem(e);
1 == t && n.setAutoRemoveOnFinish(!0);
return n;
};