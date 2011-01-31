var gamejs = require('gamejs');

/**
 * @fileoverview The images making up a animation are stored in the column of
 * the spritesheet. a spritesheet can contain multiple columns.
 */

/**
 * Access invidual images on a spritesheet image by index number
 */
var SpriteSheet = exports.SpriteSheet = function(imagePath, sheetSpec) {

   /**
    * @returns {Surface} the requested sub-surface
    */
   this.get = function(id) {
      return surfaceCache[id - offset];
   };

   /**
    * constructor
    */
   var width = sheetSpec.width;
   var height = sheetSpec.height;
   var offset = sheetSpec.offset || 0;

   var image = gamejs.image.load(imagePath);

   var surfaceCache = [];
   for (var i=0; i<image.rect.width; i+=width) {
      for (var j=0;j<image.rect.height;j+=height) {
         var srf = new gamejs.Surface([width, height]);
         var rect = new gamejs.Rect(i, j, width, height);
         srf.blit(image, new gamejs.Rect([0,0],[width,height]), rect);
         surfaceCache.push(srf);
      }
   }

   this.rect = new gamejs.Rect([0, 0], [width, height]);
   return this;
};
