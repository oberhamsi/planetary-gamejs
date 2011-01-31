var gamejs = require('gamejs');
var $v = require('gamejs/utils/vectors');

var conf = require('./config');
var gbox2d = require('./box2d');
var Ship = require('./actors').Ship;
var Planets = require('./actors').Planets;
var Pickups = require('./actors').Pickups;
var Score = require('./actors').Score;

var animator = require('./animator');
var touch = require('./touch');
var fps = require('./fps');

function main() {
   touch.init();

   // no text select on drag
   document.body.style.webkitUserSelect = 'none';
   // non right clickery
   document.body.oncontextmenu = function() { return false; };
   gbox2d.init();

   // spawn a ship at semi random position
   function spawnShip(image, isPlayer, yPos) {
      var pos = null;
      var testSprite = new gamejs.sprite.Sprite();
      testSprite.rect = new gamejs.Rect([0,0], image.getSize());
      var i = 0;
      do {
         var pos = [
            parseInt((Math.random() * conf.SCREEN_WIDTH * 0.25) +
                (isPlayer ? conf.SCREEN_WIDTH * 0.7 : 0.1), 10),
            parseInt(20 + yPos * (conf.SCREEN_HEIGHT/10))
         ];
         testSprite.rect.left = pos[0];
         testSprite.rect.top = pos[1];
         i++;
      } while(gamejs.sprite.spriteCollide(testSprite, ships) && i < 800)
      var ship = new Ship(
         pos,
         image,
         (isPlayer ? 3 : 1)
      );
      //ship.setVelocity([(Math.random() * 2) - 1, (Math.random() * 2) - 1], 5);
      ship.isPlayer = isPlayer || false;
      ships.add(ship);
      return;
   };

   // create ships
   var ships = new gamejs.sprite.Group();

   var beetle = gamejs.image.load('images/beetleship.png')
   for (var i=0; i< 4; i++) {
      ship = spawnShip(beetle, true, i);
   };

   // create enemyships
   var rocket = gamejs.image.load('images/rocketship.png');
   for (var i=0; i< 9; i++) {
      ship = spawnShip(rocket, false, i);
   }

   var planets = new Planets();
   var pickups = new Pickups();
   var fpsDisplay = new fps.FpsDisplay();

   // screen border boxes
   var THICK = 10;
   var borderBoxes = [
      // top
      new gamejs.Rect(
         [0, -THICK*5],
         [conf.SCREEN_WIDTH, THICK]
      ),
      // bottom
      new gamejs.Rect(
         [0, conf.SCREEN_HEIGHT - THICK*5],
         [conf.SCREEN_WIDTH, THICK]
      ),
      // left
      new gamejs.Rect(
         [-THICK*5, 0],
         [THICK, conf.SCREEN_HEIGHT]
      ),
      // right
      new gamejs.Rect(
         [conf.SCREEN_WIDTH - THICK*5, 1],
         [THICK, conf.SCREEN_HEIGHT]
      )

   ];
   borderBoxes.forEach(function(bb) {
      var body = gbox2d.createStaticBoxBody(bb);
   });

   /**
    * change player move delta depending on keyboard status
    */
   var dragData = {
      active: false,
   }
   function handleEvent(event) {
      if (playerDidShoot) return;

      if (event.type === gamejs.event.MOUSE_DOWN) {
         var hitShips = ships.collidePoint(event.pos);
         hitShips.forEach(function(ship) {
            if (ship.isPlayer) {
               dragData.ship = hitShips[0];
               dragData.start = dragData.ship.rect.center;
               dragData.active = true;
            }
         });
      } else if (event.type === gamejs.event.MOUSE_MOTION) {
         if (dragData.active) {
            var dir = $v.substract(event.pos, dragData.start);
            dragData.unitDir = $v.unit(dir);
            dragData.len = Math.min($v.len(dir), 200);
            dragData.end = $v.add(dragData.start, $v.multiply(dragData.unitDir, dragData.len));
         // highlight selectable ships if players turn
         } else if (isPlayerTurn) {
            var hitShips = ships.collidePoint(event.pos);
            hitShips.forEach(function(ship) {
               if (ship.isPlayer) {
                  ship.highlight();
               }
            });
         }
      } else if (event.type === gamejs.event.MOUSE_UP) {
         if (dragData.active) {
            dragData.ship.setVelocity(dragData.unitDir, dragData.len * 99999);
            dragData.active = false;
            dragData.end = false;
            dragData.ship = null;
            playerDidShoot = true;
         }
      }
      return;
   };

   var score = new Score();

   /**
    * loop
    *
    */
   var turnCount = 0;
   var isPlayerTurn = true;
   var playerDidShoot = true;
   var display = gamejs.display.setMode([conf.SCREEN_WIDTH, conf.SCREEN_HEIGHT]);
   var background = gamejs.image.load('images/background.png');
   var lastAllSleeping = false;
   var isGameOver = false;
   function tick(msDuration) {

      if (isGameOver) {
         score.drawEndScore(display, turnCount);
         return;
      }

      // debug
      gamejs.event.get().forEach(handleEvent);

      // timeStep, iterations
      gbox2d.update(msDuration);

      // did ships collide?
      gbox2d.getContacts().forEach(function(c) {
         if (c.isHit && c.force > 0) {
            [c.sprite1, c.sprite2].forEach(function(s) {
               var takeDamage = isPlayerTurn !== s.isPlayer;
               //takeDamage = (c.sprite1.isPlayer !== c.sprite2.isPlayer) && takeDamage;
               if (takeDamage) {
                  score.count += (isPlayerTurn ? 20 : -20);
               }
               s.collision(takeDamage);
               // ship killed
               if (takeDamage && s.hitCount > s.hitPoints) {
                  if (isPlayerTurn) {
                     score.destroyShip();
                  } else {
                     score.lostShip();
                  }
               }
            });
         } else if (c.isPickup) {
            if (c.sprite1 || c.sprite2) {
               (c.sprite1 || c.sprite2).collision(false);
               if (c.sprite1 && c.sprite1.isPlayer || (c.sprite2 && c.sprite2.isPlayer)) {
                  pickups.remove(c.pickup);
                  score.pickupStar();
               }
            }
         } else if (c.sprite1 || c.sprite2){
            (c.sprite1 || c.sprite2).collision(false);
         }
      });
      ships.update(msDuration);
      score.update(msDuration);
      fpsDisplay.update(msDuration);

      // if all sleeping -> turn end
      var allSleeping = true;
      ships.forEach(function(s) {
         if (!s.isSleeping()) {
            allSleeping = false;
         }
      });
      // switch between player & AI and the actual ai code
      if (allSleeping && !lastAllSleeping) {
         turnCount++;

         // game over?
         var playerAlive = false;
         var enemyAlive = false;
         ships.forEach(function(s) {
            if (s.isPlayer) {
               playerAlive = true;
            } else {
               enemyAlive = true;
            }
         });
         if (!playerAlive || !enemyAlive) {
            isGameOver = true;
         }

         if (isPlayerTurn && playerDidShoot) {
            // 3 attacks
            for (var i=0;i<2;i++) {
               // AI attack
               var enemyShips = ships.sprites().filter(function(s) {
                  return !s.isPlayer;
               });
               var len = enemyShips.length;
               var randomShip = enemyShips[parseInt((Math.random() * len), 10)];
               var closestShip = null;
               var minDistance = null;
               ships.sprites().forEach(function(ship) {
                  if (ship.isPlayer) {
                     var distance = $v.len($v.substract(randomShip.rect.center, ship.rect.center));
                     if (minDistance === null ||
                           (minDistance > distance && Math.random() < 0.4)) {
                        minDistance = distance;
                        closestShip = ship;
                     }
                  }
               });
               var dir = $v.unit($v.substract(closestShip.rect.center, randomShip.rect.center));
               randomShip.setVelocity(dir, 80000);
            }
         }
         isPlayerTurn = !isPlayerTurn;
         if (isPlayerTurn) {
            playerDidShoot = false;
            // highlight, so players sees who's are his!
            ships.forEach(function(s) {
               if (s.isPlayer) {
                  s.highlight();
               }
            });

         }
      };

      // draw
      if (!fpsDisplay.lowCPU || !allSleeping || dragData.active) {
         display.blit(background);isGameOver
         pickups.draw(display);
         planets.draw(display);
         ships.draw(display);
         score.draw(display);
         fpsDisplay.draw(display);
      }
      // draw action line if present
      if (dragData.active && dragData.end) {
         gamejs.draw.line(display, '#b7411c', dragData.start, dragData.end, 5);
         gamejs.draw.circle(display, '#2d2e3e', dragData.end, 5);
      }

      lastAllSleeping = allSleeping;
      return;
   };

   gamejs.time.fpsCallback(tick, this, 30);
};

var IMAGES = [
   'images/background.png',
   'images/numbers.png',
   'images/scoreboard.png',

   'images/planet.png',
   'images/star.png',

   'images/beetleship.png',
   'images/rocketship.png',

   'images/healthheart.png',
   'images/collisioncircle.png',
   'images/numbers',

];
// startup
gamejs.preload(IMAGES);
gamejs.ready(main);
