/**
 * @fileoverview map touch events to mouse events for drag & drop
 * @see http://ross.posterous.com/2008/08/19/iphone-touch-events-in-javascript/
 */

var EVENT_MAPPING = {
   touchstart: 'mousedown',
   touchmove: 'mousemove',
   touchend: 'mouseup'
};

function touchHandler(event){
   var touches = event.changedTouches;
   var first = touches[0];
   var type = EVENT_MAPPING[event.type];

   var simulatedEvent = document.createEvent("MouseEvent");
   simulatedEvent.initMouseEvent(type, true, true, window, 1,
                              first.screenX, first.screenY,
                              first.clientX, first.clientY, false,
                              false, false, false, 0/*left*/, null);

   first.target.dispatchEvent(simulatedEvent);
   if (event.type === 'touchmove') event.preventDefault();
   return;
};

exports.init = function(){
   document.body.style['-webkit-touch-callout'] = 'none';
   document.addEventListener("touchstart", touchHandler, true);
   document.addEventListener("touchmove", touchHandler, true);
   document.addEventListener("touchend", touchHandler, true);
   document.addEventListener("touchcancel", touchHandler, true);
   return;
};
