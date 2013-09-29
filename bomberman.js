jQuery.noConflict();
var $j = jQuery;

// Get a reference to the body - this is the element on which
// we'll be tracking mouse movement once the draggable
// tracking has been turned on.
var body = $j( "body" );


// I allow the remove server to make a request to update the
// position of the target.
//
// NOTE: By defining this function in the NOW scope, it gives
// the server access to it as well.
now.updatePosition = function( newPosition ){
    
    // Check to see if this client is in master mode; if so,
    // we won't update the position as this client is
    // actively updating its own position.
    // olivia.css( newPosition );
    
};

var canvas = null;
var ctx = null;

var player_image = null;
var computer_image = null;
var bomb_image = null;
var explosion_image = null;

var mapW = 37;
var mapH = 18;

var State = {
    input: 0,
    wait: 1
};


var UpdateType = {
    up: 0,
    down: 1,
    left: 2,
    right: 3,
    bomb: 4
}

var curr_state = State.input;

var SPACE = 32;

var LEFT = 37;
var UP = 38;
var RIGHT = 39;
var DOWN = 40;

$j(document).keydown(function(e) {
    // $("#console").html(e.which);
    if (curr_state == State.wait) {
        return;
    }
    
    if (e.which == SPACE) {
        e.preventDefault();
        pressSpace();
    } else if(e.which == LEFT || e.which == UP ||
              e.which == RIGHT || e.which == DOWN) {
        e.preventDefault();
        pressArrowKey(e.which);
    }
    
    // alert("Event: " + e);
});




var BoxType = {
    player_bomb: -1,
    blank: 0,
    wall: 1,
    brick: 2,
    player: 3,
    bomb: 4,
    explosion: 5,
    powerup_0: 6,
    powerup_1: 7,
    powerup_2: 8
};

var game_map = new Array(mapW);

for (var i=0; i<mapW; i++) {
    game_map[i] = new Array(mapH);
    for (var j=0; j<mapH; j++) {
        game_map[i][j] = BoxType.blank; //Math.floor(Math.random()*3);
    }
}


var images = null;

$j(document).ready(function() {

    images = {
        0: document.getElementById("blank"),
        undefined: document.getElementById("blank"),
        null: document.getElementById("blank"),
        1: document.getElementById("wall"),
        2: document.getElementById("brick"),
        3: document.getElementById("player"),
        4: document.getElementById("bomb"),
        5: document.getElementById("explosion"),
        6: document.getElementById("powerup-0"),
        7: document.getElementById("powerup-1"),
        8: document.getElementById("powerup-2")
    }
    images[-1] = document.getElementById("player-bomb");
});


function draw_element(el, x,y) {
    ctx.drawImage(images[el], x, y);
}

function draw_board() {
    for (var i=0; i<mapW; i++) {
        for (var j=0; j<mapH; j++) {
            draw_element(game_map[i][j], i*32, j*32);
        }
    }
}

now.update_game_map = function(g) {
    state = State.input;
    
    for (var i=0; i<mapW; i++) {
        for (var j=0; j<mapH; j++) {
            game_map[i][j] = g[i][j];
        }
    }

    draw_board();
};

now.ready(function() {
    now.updateLatestPosition();

    canvas = document.getElementById("myCanvas");
    ctx = canvas.getContext("2d");
    player_image = document.getElementById("player");
    computer_image = document.getElementById("computer");
    bomb_image = document.getElementById("bomb");
    explosion_image = document.getElementById("explosion");

    ctx.canvas.width  = window.innerWidth;
    ctx.canvas.height = window.innerHeight;
    
    ctx.drawImage(bomb_image,0,0);

    draw_board();
});


$j(window).resize(function() {
    ctx.canvas.width  = window.innerWidth;
    ctx.canvas.height = window.innerHeight;
});

function pressArrowKey(key) {
    if (state != State.input) {
        return;
    }
    
    switch(key) {
    case LEFT:
        now.send_update(UpdateType.left);
        break;
    case RIGHT:
        now.send_update(UpdateType.right);
        break;
    case UP:
        now.send_update(UpdateType.up);
        break;
    case DOWN:
        now.send_update(UpdateType.down);
        break;
    default:
        break;
    }

    state = State.wait;
}

function pressSpace() {
    if (state != State.input) {
        return;
    }

    now.send_update(UpdateType.bomb);
    state = State.wait;
}
