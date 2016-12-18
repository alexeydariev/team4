var myId=0;

var land;

var shadow;
var tank;
var turret;
var player;
var tanksList;
var explosions;

var enemies;
var enemyBullets;
var enemiesTotal = 0;
var enemiesAlive = 0;

var score = 0;
var health = 50;

var currentSpeed = 0;

var logo;

var button;
var popup;
var tween = null;

var cursors;

var bullets;
var fireRate = 100;
var nextFire = 0;

var ready = false;
var eurecaServer;
var platforms;

//this function will handle client communication with the server
var eurecaClientSetup = function() {
	//create an instance of eureca.io client
	var eurecaClient = new Eureca.Client();


	eurecaClient.ready(function (proxy) {
		eurecaServer = proxy;
	});


	//methods defined under "exports" namespace become available in the server side

	eurecaClient.exports.setId = function(id)
	{
		//create() is moved here to make sure nothing is created before uniq id assignation
		myId = id;
		create();
		eurecaServer.handshake();
		ready = true;
	}

	eurecaClient.exports.kill = function(id)
	{
		if (tanksList[id]) {
			tanksList[id].kill();
			//console.log('killing ', id, tanksList[id]);
		}
	}

	eurecaClient.exports.spawnEnemy = function(i, x, y)
	{

		if (i == myId) return; //this is me

	//	console.log('SPAWN');
		var tnk = new Tank(i, game, tank);
		tanksList[i] = tnk;
	}

	eurecaClient.exports.updateState = function(id, state)
	{
		if (tanksList[id])  {
			tanksList[id].cursor = state;
			tanksList[id].tank.x = state.x;
			tanksList[id].tank.y = state.y;
			tanksList[id].tank.angle = state.angle;
			tanksList[id].turret.rotation = state.rot;
			tanksList[id].message = state.message;
			tanksList[id].update();
		}
	}
}


Tank = function (index, game, player) {
	this.cursor = {
		left:false,
		right:false,
		up:false,
		fire:false
	}

	this.input = {
		left:false,
		right:false,
		up:false,
		fire:false
	}

    var x = game.world.randomX;
    var y = game.world.randomY;

    this.game = game;
    this.health = health;
    this.player = player;
    this.bullets = game.add.group();
    this.bullets.enableBody = true;
    this.bullets.physicsBodyType = Phaser.Physics.ARCADE;
    this.bullets.createMultiple(20, 'bullet', 0, false);
    this.bullets.setAll('anchor.x', 0.5);
    this.bullets.setAll('anchor.y', 0.5);
    this.bullets.setAll('outOfBoundsKill', true);
    this.bullets.setAll('checkWorldBounds', true);


		this.currentSpeed =0;
    this.fireRate = 500;
    this.nextFire = 0;
    this.alive = true;

    this.shadow = game.add.sprite(x, y, 'tank', 'shadow');
    this.tank = game.add.sprite(x, y, 'tank', 'tank1');
    this.turret = game.add.sprite(x, y, 'tank', 'turret');

    this.shadow.anchor.set(0.5);
    this.tank.anchor.set(0.5);
    this.turret.anchor.set(0.3, 0.5);

    this.tank.id = index;
    game.physics.enable(this.tank, Phaser.Physics.ARCADE);
    this.tank.body.immovable = false;
    this.tank.body.collideWorldBounds = true;
    this.tank.body.bounce.setTo(0, 0);

    this.tank.angle = 0;

    game.physics.arcade.velocityFromRotation(this.tank.rotation, 0, this.tank.body.velocity);

};

Tank.prototype.update = function() {

	var inputChanged = (
		this.cursor.left != this.input.left ||
		this.cursor.right != this.input.right ||
		this.cursor.up != this.input.up ||
		this.cursor.fire != this.input.fire
	);


	if (inputChanged)
	{
		//Handle input change here
		//send new values to the server
		if (this.tank.id == myId)
		{
			// send latest valid state to the server
			this.input.x = this.tank.x;
			this.input.y = this.tank.y;
			this.input.angle = this.tank.angle;
			this.input.rot = this.turret.rotation;
			this.input.message = "hello";
			this.input.space = "space pressed";

			eurecaServer.handleKeys(this.input);

		}
	}

	//cursor value is now updated by eurecaClient.exports.updateState method

		// Recieve other players stats
		if (this.tank.id != myId && inputChanged)
		{
			//console.log(this.message)

		}

    if (this.cursor.left)
    {
        this.tank.angle -= 1;
    }
    else if (this.cursor.right)
    {
        this.tank.angle += 1;
    }
    if (this.cursor.up)
    {
        //  The speed we'll travel at
        this.currentSpeed = 300;
    }
    else
    {
        if (this.currentSpeed > 0)
        {
            this.currentSpeed -= 4;
        }
    }
    if (this.cursor.fire)
    {
		this.fire({x:this.cursor.tx, y:this.cursor.ty});
    }

    if (this.currentSpeed > 0)
    {
        game.physics.arcade.velocityFromRotation(this.tank.rotation, this.currentSpeed, this.tank.body.velocity);
    }
		else
		{
			game.physics.arcade.velocityFromRotation(this.tank.rotation, 0, this.tank.body.velocity);
		}



    this.shadow.x = this.tank.x;
    this.shadow.y = this.tank.y;
    this.shadow.rotation = this.tank.rotation;

    this.turret.x = this.tank.x;
    this.turret.y = this.tank.y;
};


Tank.prototype.fire = function(target) {
		if (!this.alive) return;
        if (this.game.time.now > this.nextFire && this.bullets.countDead() > 0)
        {
            this.nextFire = this.game.time.now + this.fireRate;
            var bullet = this.bullets.getFirstDead();
            bullet.reset(this.turret.x, this.turret.y);

			bullet.rotation = this.game.physics.arcade.moveToObject(bullet, target, 500);
        }
};

Tank.prototype.damage = function() {

    this.health -= 1;

    if (this.health <= 0)
    {
        //this.alive = false;
        this.shadow.kill();
        this.tank.kill();
        this.turret.kill();
        return true;
    }

    return false;

}

Tank.prototype.kill = function() {
	//this.alive = false;
	this.tank.kill();
	this.turret.kill();
	this.shadow.kill();
}

// BOT TANKS:
EnemyTank = function (index, game, player, bullets) {

    var x = game.world.randomX;
    var y = game.world.randomY;

    this.game = game;
    this.health = 3;
    this.player = player;
    this.bullets = bullets;
    this.fireRate = 1000;
    this.nextFire = 0;
    this.alive = true;

    this.shadow = game.add.sprite(x, y, 'enemy', 'shadow');
    this.tank = game.add.sprite(x, y, 'enemy', 'tank1');
    this.turret = game.add.sprite(x, y, 'enemy', 'turret');

    this.shadow.anchor.set(0.5);
    this.tank.anchor.set(0.5);
    this.turret.anchor.set(0.3, 0.5);

    this.tank.name = index.toString();
    game.physics.enable(this.tank, Phaser.Physics.ARCADE);
    this.tank.body.immovable = false;
    this.tank.body.collideWorldBounds = true;
    this.tank.body.bounce.setTo(1, 1);

    this.tank.angle = game.rnd.angle();

    game.physics.arcade.velocityFromRotation(this.tank.rotation, 100, this.tank.body.velocity);

};

EnemyTank.prototype.damage = function() {

    this.health -= 1;

    if (this.health <= 0)
    {
        this.alive = false;

        this.shadow.kill();
        this.tank.kill();
        this.turret.kill();

        return true;
    }

    return false;

}

EnemyTank.prototype.update = function() {

    this.shadow.x = this.tank.x;
    this.shadow.y = this.tank.y;
    this.shadow.rotation = this.tank.rotation;

    this.turret.x = this.tank.x;
    this.turret.y = this.tank.y;
    this.turret.rotation = this.game.physics.arcade.angleBetween(this.tank, this.player);

    if (this.game.physics.arcade.distanceBetween(this.tank, this.player) < 300)
    {
        if (this.game.time.now > this.nextFire && this.bullets.countDead() > 0)
        {
            this.nextFire = this.game.time.now + this.fireRate;

            var bullet = this.bullets.getFirstDead();

            bullet.reset(this.turret.x, this.turret.y);

            bullet.rotation = this.game.physics.arcade.moveToObject(bullet, this.player, 500);
        }
    }

};

var game = new Phaser.Game(1200, 800, Phaser.AUTO, 'phaser-example', { preload: preload, create: eurecaClientSetup, update: update, render: render });

function preload () {

    game.load.atlas('tank', 'assets/tanks.png', 'assets/tanks.json');
    game.load.atlas('enemy', 'assets/enemy-tanks.png', 'assets/tanks.json');
    game.load.image('logo', 'assets/logo.png');
    game.load.image('bullet', 'assets/bullet.png');
    game.load.image('earth', 'assets/scorched_earth.png');
    game.load.spritesheet('kaboom', 'assets/explosion.png', 64, 64, 23);
		game.load.image('ground_h', 'assets/platform_.png');
		game.load.image('ground', 'assets/platform.png');

		//Popup message
		game.load.image('close', 'assets/restart.png', 193, 71);
		game.load.image('background', 'assets/gameover.png');
		//game.load.spritesheet('button', 'assets/button_sprite_sheet.png', 193, 71);
}



function create () {

    //  Resize our game world to be a 2000 x 2000 square
    game.world.setBounds(0, 0, 1600, 1200);
	game.stage.disableVisibilityChange  = true;

    //  Our tiled scrolling background
    land = game.add.tileSprite(0, 0, 1600, 1200, 'earth');
    land.fixedToCamera = true;

		//button = game.add.button(game.world.centerX, game.world.centerY, 'button', openWindow, this, 2, 1, 0);
    //button.input.useHandCursor = true;

		// Popup txt = this.game.add.text(game.camera.width / 2, game.camera.height / 2, "Test", {font: "30px Arial", fill: "#ffffff", stroke: '#000000', strokeThickness: 3});txt.anchor.setTo(0.5, 0.5);txt.fixedToCamera = true;

		popup = game.add.sprite(game.camera.width/2, game.camera.height/2, 'background');
		popup.anchor.setTo(0.5, 0.5);
		popup.fixedToCamera = true;
		popup.alpha = 0.8;
	  popup.visible = false;
	  popup.inputEnabled = true;

		//  Position the close button to the bottom-center of the popup sprite (minus 8px for spacing)
    var pw = (popup.width / 2) - 450;
    var ph = (popup.height / 2) - 250;

			//  And click the close button to close it down again
		 var closeButton = game.make.sprite(pw, -ph, 'close');
		 closeButton.inputEnabled = true;
		 closeButton.input.priorityID = 1;
		 closeButton.input.useHandCursor = true;
		 closeButton.events.onInputDown.add(closeWindow, this);


		 var style = { font: "40px Arial", fill: "#ffffff", wordWrap: true, wordWrapWidth: popup.width, align: "center", backgroundColor: "#ffffff" };

		 text = game.add.text(0, 0, "GAME OVER", style);
     text.anchor.set(0.5);

		 //  Add the "close button" to the popup window image
		 popup.addChild(closeButton);
		 popup.addChild(text);

		 //  Hide it awaiting a click
		 popup.scale.set(0.1);


		game.physics.startSystem(Phaser.Physics.ARCADE);

		platforms = game.add.group();

		platforms.enableBody = true;

		var ground_S = platforms.create(0, game.world.height - 64, 'ground');
		var ground_N = platforms.create(0, 0, 'ground');
		var ground_E = platforms.create(0, 0, 'ground_h');
		var ground_V = platforms.create(game.world.width - 64, 0, 'ground_h');
		var barrier1 = platforms.create(300, 200, 'ground_h');
		var barrier2 = platforms.create(720, 150, 'ground_h');
		var barrier3 = platforms.create(1000, 300, 'ground');
		var barrier4 = platforms.create(1000, 1000, 'ground');

		ground_S.scale.setTo(4, 2);
		ground_N.scale.setTo(4, 2);
		ground_E.scale.setTo(2, 4);
		ground_V.scale.setTo(2, 4);

		ground_S.body.allowGravity = false;
		ground_N.body.allowGravity = false;
		ground_E.body.allowGravity = false;
		ground_V.body.allowGravity = false;
		barrier1.body.allowGravity = false;
		barrier2.body.allowGravity = false;
		barrier3.body.allowGravity = false;
		barrier4.body.allowGravity = false;

		ground_S.body.immovable = true;
		ground_N.body.immovable = true;
		ground_E.body.immovable = true;
		ground_V.body.immovable = true;
		barrier1.body.immovable = true;
		barrier2.body.immovable = true;
		barrier3.body.immovable = true;
		barrier4.body.immovable = true;

    tanksList = {};

	player = new Tank(myId, game, tank);
	tanksList[myId] = player;
	tank = player.tank;
	turret = player.turret;
	tank.x=game.world.randomX;
	tank.y=game.world.randomY;
	bullets = player.bullets;
	shadow = player.shadow;

	player.enableBody = true;
    game.physics.arcade.enable(player);

	//  The enemies bullet group
	enemyBullets = game.add.group();
	enemyBullets.enableBody = true;
	enemyBullets.physicsBodyType = Phaser.Physics.ARCADE;
	enemyBullets.createMultiple(100, 'bullet');

	enemyBullets.setAll('anchor.x', 0.5);
	enemyBullets.setAll('anchor.y', 0.5);
	enemyBullets.setAll('outOfBoundsKill', true);
	enemyBullets.setAll('checkWorldBounds', true);

	//  Create some baddies to waste :)
	enemies = [];

	enemiesTotal = 20;
	enemiesAlive = 20;

	for (var i = 0; i < enemiesTotal; i++)
	{
			enemies.push(new EnemyTank(i, game, tank, enemyBullets));
	}


    //  Explosion pool
    explosions = game.add.group();

    for (var i = 0; i < 10; i++)
    {
        var explosionAnimation = explosions.create(0, 0, 'kaboom', [0], false);
        explosionAnimation.anchor.setTo(0.5, 0.5);
        explosionAnimation.animations.add('kaboom');
    }

    tank.bringToTop();
    turret.bringToTop();

    logo = game.add.sprite(200, 300, 'logo');
    logo.fixedToCamera = true;

    game.input.onDown.add(removeLogo, this);

    game.camera.follow(tank);
    game.camera.deadzone = new Phaser.Rectangle(150, 150, 500, 300);
    game.camera.focusOnXY(0, 0);

    cursors = game.input.keyboard.createCursorKeys();

	setTimeout(removeLogo, 1000);

}

function removeLogo () {
    game.input.onDown.remove(removeLogo, this);
    logo.kill();
}


function update () {
	//do not update if client not ready
	if (!ready) return;

	game.physics.arcade.collide(tank, platforms);
	//game.physics.arcade.collide(enemies[tank.name], platforms);
	//game.physics.arcade.collide(bullets, platforms)
	game.physics.arcade.collide(bullets, platforms, function(bullets, platforms) {
		bullets.kill();
	})
	game.physics.arcade.collide(enemyBullets, platforms, function(bullets, platforms) {
		bullets.kill();
	})
	// {
	// 	bullet.kill();
	// }


	//from original
	game.physics.arcade.overlap(enemyBullets, tank, bulletHitPlayer, null, this);

	enemiesAlive = 0;

	for (var i = 0; i < enemies.length; i++)
	{
			if (enemies[i].alive)
			{
					enemiesAlive++;
					game.physics.arcade.collide(tank, enemies[i].tank);
					game.physics.arcade.overlap(bullets, enemies[i].tank, bulletHitEnemy, null, this);
					game.physics.arcade.collide(enemies[i].tank, platforms);

					//enemies[i].tank.body.bounce.set(1);

					enemies[i].update();
			}
	}
	/// end of original

	player.input.left = cursors.left.isDown;
	player.input.right = cursors.right.isDown;
	player.input.up = cursors.up.isDown;
	player.input.fire = game.input.activePointer.isDown;
	player.input.tx = game.input.x+ game.camera.x;
	player.input.ty = game.input.y+ game.camera.y;



	turret.rotation = game.physics.arcade.angleToPointer(turret);
    land.tilePosition.x = -game.camera.x;
    land.tilePosition.y = -game.camera.y;



    for (var i in tanksList)
    {
		if (!tanksList[i]) continue;
		var curBullets = tanksList[i].bullets;
		var curTank = tanksList[i].tank;
		for (var j in tanksList)
		{
			if (!tanksList[j]) continue;
			if (j!=i)
			{

				var targetTank = tanksList[j].tank;

				game.physics.arcade.overlap(curBullets, targetTank, bulletHitPlayer, null, this);

			}
			if (tanksList[j].alive)
			{
				tanksList[j].update();
			}
		}
    }
}

function bulletHitPlayer (tank, bullet) {

    bullet.kill();
		health -= 1;

		var destroyed = tanksList[tank.id].damage();
    if (destroyed)
    {
        var explosionAnimation = explosions.getFirstExists(false);
        explosionAnimation.reset(tank.x, tank.y);
        explosionAnimation.play('kaboom', 30, false, true);

				game.time.events.add(Phaser.Timer.SECOND*0.2, openWindow, this);
    }
}

function bulletHitEnemy (tank, bullet) {

    bullet.kill();

    var destroyed = enemies[tank.name].damage();

    if (destroyed)
    {
        var explosionAnimation = explosions.getFirstExists(false);
        explosionAnimation.reset(tank.x, tank.y);
        explosionAnimation.play('kaboom', 30, false, true);
				score = score + 10;
    }

}

function render () {
	// game.debug.text('Active Bullets: ' + bullets.countLiving() + ' / ' + bullets.length, 32, 32);
	game.debug.text('Enemies: ' + enemiesAlive + ' / ' + enemiesTotal, 32, 32);
	game.debug.text('Your Score: ' + score, 32, 64);
	game.debug.text('Your Health: ' + health, 32, 96);
	//game.debug.text('Player ' + tanksList[tank.id] + ' score: ' + score, 32, 96);
}

function openWindow() {

    if ((tween !== null && tween.isRunning) || popup.scale.x === 1)
    {
        return;
    }

    //  Create a tween that will pop-open the window, but only if it's not already tweening or open
		popup.visible = true;
    tween = game.add.tween(popup.scale).to( { x: 1, y: 1 }, 1000, Phaser.Easing.Elastic.Out, true);

}

function closeWindow() {

    if (tween && tween.isRunning || popup.scale.x === 0.1)
    {
        return;
    }

    //  Create a tween that will close the window, but only if it's not already tweening or closed
    tween = game.add.tween(popup.scale).to( { x: 0.1, y: 0.1 }, 500, Phaser.Easing.Elastic.In, true);
		popup.visible = false;

		//reset(x, y, health) → {PIXI.DisplayObject}
}
