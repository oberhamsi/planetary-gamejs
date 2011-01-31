var objects = require('gamejs/utils/objects');

/**
 * @param {Array} pos
 */
var world = null;
var contactListener = null;

exports.createShipBody = function(sprite, pos, radius) {
   // box2d
   var bodyDef = new b2BodyDef();
   bodyDef.position.Set(pos[0], pos[1]);
   var body = world.CreateBody(bodyDef);
   var shapeDef = new b2CircleDef();
   shapeDef.radius = radius;
   body.w = radius;
   body.h = radius;
   shapeDef.restitution = 0.4;
   shapeDef.density = 0.1;
   shapeDef.userData = {sprite: sprite};
   body.CreateShape(shapeDef);
   body.SetMassFromShapes();
   body.m_linearDamping = 0.6;
   body.m_fixedRotation = true;
   return body
};

exports.createStaticCircle = function(pos, radius, isPickup) {
   var bodyDef = new b2BodyDef();
   bodyDef.position.Set(pos[0], pos[1]);
   var body = world.CreateBody(bodyDef);
   var shapeDef = new b2CircleDef();
   shapeDef.restitution = 0.2;
   shapeDef.friction = 0.1;
   shapeDef.density = 999999;
   shapeDef.radius = radius;
   // sensor = pickup; dirty hack: pos also defines that it is pickup
   shapeDef.userData = {isPickup: isPickup, pos: pos};
   body.CreateShape(shapeDef);
   body.SetMassFromShapes();
   return body
};

exports.destroyBody = function(body) {
   world.DestroyBody(body);
};

exports.createStaticBoxBody = function(rect) {

   var groundBodyDef = new b2BodyDef();
   groundBodyDef.position.Set(rect.center[0], rect.center[1]);
   var groundBody = world.CreateBody(groundBodyDef);
   var groundShapeDef = new b2PolygonDef();
   groundShapeDef.restitution = 0.2;
   groundShapeDef.friction = 0.9;
   groundShapeDef.density = 999999;
   groundShapeDef.SetAsBox(rect.width/2, rect.height/2);
   groundBody.CreateShape(groundShapeDef);
   groundBody.SynchronizeShapes();
   // set a mass from shape or we get delay on hit
   // no mass = static, don't move
   groundBody.SetMassFromShapes();
   return groundBody;
};

exports.init = function() {
   var worldAABB = new b2AABB();
   worldAABB.lowerBound.Set(-10000.0, -10000.0);
   worldAABB.upperBound.Set(10000.0, 10000.0);
   var gravity = new b2Vec2(0, 0);
   world = new b2World(worldAABB, gravity, true);

   contactListener = new ContactListener();
   world.SetContactListener(contactListener);
   return;
};

exports.update = function(msDuration) {
   world.Step(msDuration/1000, 10);
};

function ContactListener() {

   var contacts = {};
   this.prototype = new b2ContactListener();

   this.Remove = function(contactPoint) {
      delete contacts[contactPoint.id];
   };

   this.Result = function(contactResult) {
      var sprites = [];
      var data1 = contactResult.shape1.GetUserData();
      var data2 = contactResult.shape2.GetUserData();
      var sprite1 = null;
      var sprite2 = null;
      var pickup = null;
      if (data1 && data1.sprite) sprite1 = data1.sprite;
      if (data2 && data2.sprite) sprite2 = data2.sprite;
      if (data1 && data1.isPickup) pickup = data1.pos;
      if (data2 && data2.isPickup) pickup = data2.pos;

      var id = contactResult.id;
      contacts[id] = {
         id: id,
         force: contactResult.normalImpulse,
         sprites: sprites,
         sprite1: sprite1,
         sprite2: sprite2,
         isHit: sprite1 && sprite2,
         isPickup: pickup !== null,
         pickup: pickup
      };
   };

   this.Add = function() {};
   this.Persist = function() {};

   this.getContacts = function() {
      var i = 0;
      var arr = [];
      objects.keys(contacts).forEach(function(key) {
         arr.push(contacts[key]);
      });
      return arr;
   };

   return this;
}

exports.getContacts = function() {
   return contactListener.getContacts();
}
