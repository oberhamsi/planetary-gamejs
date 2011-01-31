var gamejs = require('gamejs');
var objects = require('gamejs/utils/objects');
var $v = require('gamejs/utils/vectors');

var animator = require('./animator');
var gbox2d = require('./box2d');
var conf = require('./config');

/**
 * Ship
 */
var Ship = exports.Ship = function(pos, image, hitPoints) {
   Ship.superConstructor.apply(this, arguments);

   this.origImage = image;
   var imgSize = this.origImage.getSize();
   this.image = new gamejs.Surface(imgSize);
   this.image.blit(this.origImage);
   this.b2body = gbox2d.createShipBody(this, pos, imgSize[0]/3);
   this.rect = new gamejs.Rect(pos, imgSize);

   this.heartImage = gamejs.image.load('images/healthheart.png');
   this.collisionImage = gamejs.image.load('images/collisioncircle.png');

   this.isHighlighted = false;
   this.highlightDuration = 0;

   this.isHit = false;
   this.hitCount = 0;
   this.hitDuration = 0;

   this.hitPoints = hitPoints;

   return this;
};
objects.extend(Ship, gamejs.sprite.Sprite);

Ship.prototype.isSleeping = function() {
   return this.b2body.IsSleeping();
};

Ship.prototype.setVelocity = function(direction, speed) {
   var v = $v.multiply(direction, speed * 1000);
   var c = this.rect.center;
   this.b2body.ApplyImpulse(new b2Vec2(v[0], v[1]), new b2Vec2(c[0], c[1]));
   return;
};

Ship.prototype.update = function(msDuration) {
   if (this.hitCount > this.hitPoints) {
      this.kill();
      gbox2d.destroyBody(this.b2body);
      return;
   }

   if (!this.b2body.IsSleeping()) {
      var t = this.b2body.m_xf;
      this.rect.left = t.position.x;
      this.rect.top = t.position.y;

      // if velocity very low = stand still
      var vel = this.b2body.GetLinearVelocity();
      if (!this.isHit && Math.abs(vel.x) < 20 && Math.abs(vel.y) < 20) {
         this.b2body.PutToSleep();
      }
   }

   /// adjust image angle
   //this.image.clear();
   if (this.isHit) {
      this.hitDuration += msDuration;
      if (this.hitDuration > 200) {
         this.isHit = false;
      }
   };

   if (this.isHighlighted) {
      this.highlightDuration += msDuration;
      if (this.highlightDuration > 500) {
         this.isHighlighted = false;
      }
   }

   return;
};

Ship.prototype.draw = function(display) {
   // hit circle
   if (this.isHit) {
      var crect = this.collisionImage.rect;
      crect.left = this.rect.left;
      crect.top = this.rect.top + (this.rect.height / 2);
      display.blit(this.collisionImage, crect);
   };

   // normal pic
   var rect = this.rect.clone();
   if (this.isHighlighted) {
      var zerotwo = this.rect.width * 0.3;
      rect.width += zerotwo;
      rect.height += zerotwo;
      rect.center = $v.substract(rect.center, [zerotwo/2, zerotwo/2]);
   }
   display.blit(this.origImage, rect);
   for (var i=0; i < this.hitPoints - this.hitCount; i++) {
      display.blit(this.heartImage, rect.move(-10 + i * 10, -30).center);
   }
   return;
}

Ship.prototype.highlight = function() {
   if (this.isHighlighted === true) return;

   this.isHighlighted = true;
   this.highlightDuration = 0;
   return;
};

Ship.prototype.collision = function(takeDamage) {
   if (this.isHit === true) {
      return;
   }
   if (takeDamage) {
      this.hitCount++;
   }
   this.hitDuration = 0;
   this.isHit = true;
   return;
};

/**
 * all planets
 */
var Planets = exports.Planets = function() {
   var planetCenters = [];
   var planetImage = gamejs.image.load('images/planet.png');
   var radius = planetImage.rect.width/2;

   this.draw = function(display) {
      planetCenters.forEach(function(pc) {
         display.blit(planetImage, [pc[0] - radius/2, pc[1] - radius/2]);
      });
   };

   /**
    * constructors
    */
   var i = 0;
   while (i<4) {
      var pos = [
         parseInt((Math.random() * conf.SCREEN_WIDTH * 0.4) + conf.SCREEN_WIDTH * 0.3, 10),
         parseInt((Math.random() * conf.SCREEN_HEIGHT * 0.7) + conf.SCREEN_HEIGHT * 0.1, 10)
      ];
      var hit = false;
      planetCenters.forEach(function(pc) {
         if ($v.len($v.substract(pc, pos)) < radius * 2) {
            hit = true;
         }
      });
      if (hit) continue;

      planetCenters.push(pos);
      gbox2d.createStaticCircle(pos, radius);
      i++;
   }
   return this;
};

/**
 * pickups
 */
var Pickups = exports.Pickups = function() {
   var centers = {};
   var image = gamejs.image.load('images/star.png');
   var radius = image.rect.width/2;

   function k(p) {
      return p[0] + '.' + p[1];
   }

   this.draw = function(display) {
      objects.keys(centers).forEach(function(k) {
         var c = centers[k].pos;
         display.blit(image, [c[0] + radius, c[1] + radius]);
      });
   };

   this.remove = function(pos) {
      gbox2d.destroyBody(centers[k(pos)].body);
      delete centers[k(pos)];
      return;
   };

   /**
    * constructors
    */
   var tries = 0;
   for (var i=0;i<10;i++) {
      tries++;
      var pos = [
         parseInt((Math.random() * conf.SCREEN_WIDTH * 0.5) + conf.SCREEN_WIDTH * 0.2, 10),
         parseInt((Math.random() * conf.SCREEN_HEIGHT * 0.8) + conf.SCREEN_HEIGHT * 0.05, 10)
      ];
      var hit = false;
      objects.keys(centers).forEach(function(key) {
         var pc = centers[key].pos;
         if ($v.len($v.substract(pc, pos)) < radius * 2) {
            hit = true;
         }
      });
      if (hit || tries > 20) {
         i--;
         continue;
      }
      tries = 0 ;
      centers[k(pos)] = {
         pos: pos,
         body: gbox2d.createStaticCircle(pos, radius, true),
      };
   }
   return this;
};

exports.Score = function() {
   var numberSheet = new animator.SpriteSheet('images/numbers.png', {width: 20, height: 20});
   var scoreBoard = gamejs.image.load('images/scoreboard.png');
   var font = new gamejs.font.Font('32px Verdana, Helvetica, Arial, sans-serif');

   var score = {
      stars: 0,
      destroyed: 0,
      lost: 0
   };
   var totalScore = 0;

   var HIGHLIGHT_DURATION = 1000;
   var HIGHLIGHT_SCALE = 2;
   var highlight = {
      active: false,
      duration: 0
   }

   this.draw = function(display) {
      // draw "score"
      var scorePos = new gamejs.Rect((conf.SCREEN_WIDTH / 2) - 50, 10);
      totalScore.toString().split('').forEach(function(c, idx) {
         var numberImg = numberSheet.get(parseInt(c, 10));
         if (highlight.active) {
            var scale = 1 + HIGHLIGHT_SCALE * (highlight.duration / HIGHLIGHT_DURATION);
            numberImg = gamejs.transform.scale(numberImg, [scale, scale]);
         }
         display.blit(numberImg, scorePos);
         scorePos.moveIp([numberImg.rect.width, 0]);
      });
   };

   this.drawEndScore = function(display, turns) {
      var offset = [50, 50];
      var color = '#383838';
      display.blit(scoreBoard, offset);

      offset[0] += scoreBoard.getSize()[0];
      offset[0] += 10;
      offset[1] -= 8;

      display.blit(font.render(score.destroyed, color), offset);
      offset[1] += 32;
      display.blit(font.render(score.stars, color), offset);
      offset[1] += 73;
      display.blit(font.render(score.lost, color), offset);
      offset[1] += 32;
      display.blit(font.render(parseInt(turns/2, 10), color), offset);
      return;
   };

   this.update = function(msDuration) {
      highlight.duration += msDuration;
      if (highlight.duration > HIGHLIGHT_DURATION) {
         highlight.active = false;
      }
   };

   this.pickupStar = function() {
      score.stars++;
      this.count += 100;
   };

   this.destroyShip = function() {
      score.destroyed++;
      this.count += 100;
   };

   this.lostShip = function() {
      score.lost++;
      this.count -= 100;
   };

   objects.accessors(this, {
      count: {
         get: function() {
            return totalScore;
         },
         set: function(newValue) {
            if (newValue > totalScore) {
               highlight.active = true;
               highlight.duration = 0;
            }
            totalScore = newValue;
            return totalScore;
         }
      }
   });

   return;
};
