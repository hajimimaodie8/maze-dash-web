window.tileType = {
kTileDataBlock: 0,
kTileDataSpace: 1,
kTileDataPortal: 2,
kTileDataKey: 4,
kTileDataArrowUp: 5,
kTileDataArrowRight: 6,
kTileDataArrowDown: 7,
kTileDataArrowLeft: 8,
kTileDataHead: -1,
kTileDataBody: -2,
kTileDataLock: -3,
kTileDataDestroyable: -4,
kTileDataPortU: 1001,
kTileDataPortD: 1002,
kTileDataPortL: 1003,
kTileDataPortR: 1004
};

window.Direction = {
DirectionUp: 1,
DirectionDown: 2,
DirectionLeft: -1,
DirectionRight: -2
};

window.CloneJson = function(a) {
var i = JSON.stringify(a);
return JSON.parse(i);
};