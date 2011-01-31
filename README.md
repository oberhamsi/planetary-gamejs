Planetary
===============================

Play: http://gamejs.org/apps/planetary
Code: http://github.com/oberhamsi/telemachus-gamejs/

Box2d
-------

The game interacts with the box2d code via my custom, small box2d.js module. This module initializes the physics world and provides us with functions to create the handfull of predefined body forms needed.

The ship sprite is the only moving sprite and therefor the only type of object  that must update its position according to the box2d simulation. It does so by reading the appropriate values from the box2d body it has attached:

   // in Ship.prototype.update
   var t = this.b2body.m_xf;
   this.rect.left = t.position.x;
   this.rect.top = t.position.y;

Compared to the other sprites, ships interact a lot with the physics stuff. For example, I forcefully stop a Ship once it moves really slowly (to avoid boring the player).

Another box2d related class to highlight is the ContactListener. The listener instance gets informed about all collision in the box2d world. The collision results only specify the box2d bodies involved but each of those bodies has a userData object attached. And via that userData the ContactListener can resolve which sprite or other game object the physics body belongs to and what the collision means for the game (e.g., point scored, ship killed).

Touch interfaces & low CPU environment
---------------------------------------

Planetary runs on the iPad at about 7 frames per second. I took extra care *not* to deplete the iPad's battery: fps.js keeps an average of the frames rendered per second. Heavy optimizations kick in if the average drops below a certain threshold.

For touch interfaces I am simply re-dispatching touch events as mouse events. The mouse events then get picked up, as usual, by the GameJs event system. This is good enough for simple drag & drop interactions. And that way I didn't even have to modify any of the game's event handlers. The small touch.js module creates the necessary Dom handlers that do the re-dispatching.

The rest of the modules are the usual suspects: actors.js holds the gamejs.sprite.Sprite subclasses - anything visible on the screen - and main.js is mostly model logic and event handling.
