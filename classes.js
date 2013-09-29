var prototype = require('prototype');
var sets = require('simplesets');

var BoxType = {
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



var Direction = {
    up: 0,
    down: 1,
    left: 2,
    right: 3
};


var BlockType = {
    blank: 0,
    wall: 1,
    brick: 2
};

var PowerupType = {
    extraBomb: 0,
    bombPower: 1,
    speed: 2
};

var UpdateType = {
    up: 0,
    down: 1,
    left: 2,
    right: 3,
    bomb: 4
}


var bombs = new sets.Set();
var explosions = new sets.Set();
var powerups = new sets.Set();

var humans = new sets.Set();

var players_by_id = {};

var mapW = 100;
var mapH = 100;


var map_objects = new Array(mapW);

for (var i=0; i<mapW; i++) {
    map_objects[i] = new Array(mapH);
}

var map = new Array(mapW);

for (var i=0; i<mapW; i++) {
    map[i] = new Array(mapH);
}


function random_block() {
    return new Block(Math.floor(Math.random()*3));
}

function generate_map() {
    for (var i=0; i<mapW; i++) {
        for (var j=0; j<mapH; j++) {
            map[i][j] = random_block();
        }
    }
}

function set_object(pos, obj) {
    console.log(pos + '');
    map_objects[pos[0]][pos[1]] = obj;
}

function get_object(pos) {
    return map_objects[pos[0]][pos[1]];
}

function get_block(pos) {
    return map[pos[0]][pos[1]];
}

function get_player(position) {
    // players = humans.union(computers);
    for (var player in humans.array()) {
        if ( player.position == position) {
            return player;
        }
    }
    return false;
}

function can_move(p) {
    if ( ! get_block(p).is_walkable() ) {
        return false;
    }
    obj = get_object(p);
    return (obj == null || (obj instanceof Powerup) || (obj instanceof Explosion));
}

function can_explosion_pass(p) {
    return (get_block(p).is_bomb_passable() && get_object(p) == null);
}

function is_valid_position(p) {
    return (p[0] >= 0 && p[1] >= 0 && p[0] < mapW && p[1] < mapH);
}

function adjacent_positions(pos) {
    var p = pos.slice(0);
    var out = [];
    var arr = [[0,1], [0, -1], [1, 0], [-1, 0]];
    for (var i=0; i<arr.length; i++) {
        x = arr[i];
        x[0] += p[0];
        x[1] += p[1];
        if(is_valid_position(x)) {
            out.push(x);
        }
    }
    return out;
}

var Bomb = Class.create({
    initialize: function (power, position, player) {
        this.power = power;
        this.position = position;
        this.timeleft = 2000;
        this.player = player;
    },

    update: function(timelapsed) {
        this.timeleft -= timelapsed;
        if (this.timeleft < 0) {
            this.explode();
        }
    },

    explode: function() {
        this.remove();
        explosions.add(new Explosion(this.power, this.position));
        this.player.recharge_bomb();
    },

    remove: function() {
        bombs.remove(this);
        if(get_object(this.position) == this) {
            set_object(this.position, null);
        }
    }
});

var Explosion = Class.create({
    initialize: function(power, position){
        this.power = power;
        this.position = position;
        this.timeleft = 1000;

        var ps = this.explode();
        ps.push(this.position);
        this.exploded_positions = ps;

        for(var i=0; i<ps.length; i++) {
            var pos = ps[i];
            set_object(pos, this);

            var player = get_player(this.position);
            if (player) {
                get_player(this.position).die();
            }
        }

    },

    update: function(timelapsed) {
        this.timeleft -= timelapsed;
        if(this.timeleft < 0) {
            this.remove();
        }
    },
    remove: function() {
        
        for(var i=0; i< this.exploded_positions.length; i++) {
            var pos = this.exploded_positions[i];
            set_object(pos, null);
            explosions.remove(this);
        }
    },

    explode: function() {
        // Returns the array of positions of the explosion in a direction dir from the bomb, in order
        final = []

        var arr = [[0, -1], [0, 1], [1, -1], [1, 1]];
        var p, new_position;
        
        for (var x=0; x<arr.length; x++) {
            var axis = arr[x][0];
            var increment = arr[x][1];

            new_position = this.position.slice(0);
            
            for(var i=0; i<this.power; i++) {
                new_position[axis] += increment;
                if (!is_valid_position(new_position)) {
                    break;
                } else if (can_explosion_pass(new_position)) {
                    final.push(new_position.slice(0));
                } else {
                    obj = get_object(new_position);
                    
                    
                    if (obj != null) {
                        if (obj instanceof Powerup) {
                            powerups.remove(obj);
                        } else if (obj instanceof Bomb) {
                            obj.explode();
                        } else if (obj instanceof Player) {
                            obj.die();
                            final.push(new_position.slice(0));
                        }
                        
                        if (obj instanceof Explosion) {
                            set_object(new_position, null)
                        }
                    }

                    if (get_block(new_position).is_destroyable()) {
                        get_block(new_position).destroy()
                        if (Math.random() < powerup_proportion) {
                            p = random_powerup(new_position)
                            powerups.add(p)
                            set_object(new_position, p)
                        }
                    }

                    // need extra check for players because player may not be
                    // on map if placing bomb
                    p = get_player(new_position);
                    if (p) {
                        final.push(new_position.slice(0));
                        p.die();
                    }
                    break;
                }
            }
        }
        
        return final;
    }
});

var Block = Class.create({
    initialize: function(btype) {
        if(btype == null) { btype = BlockType.blank; }
        this.btype = btype
    },
    is_walkable: function() { 
        return this.btype != BlockType.wall && this.btype != BlockType.brick;
    },
    is_destroyable: function() {
        return this.btype == BlockType.brick;
    },
    
    is_bomb_passable: function() {
        return this.btype == BlockType.blank;
    },
    destroy: function() {
        if (this.is_destroyable()) {
            this.btype = BlockType.blank;
            return true;
        } else {
            return false;
        }
    }
});

/*

  read_map_from_file = true

  if (read_map_from_file) {
  textfile = open("map.txt", "rt")
  map = [[null for x in range(mapH)] for y in range(mapW)]
  startmap = [[null for x in range(mapH)] for y in range(mapW)]
  for i in range(mapH) {
  line = textfile.readline()
  for j in range(mapW) {
  map[j][i] = Block(map_key.get(line[j], BlockType.blank))
  startmap[j][i] = Block(map_key.get(line[j], BlockType.blank))
  }
  }
  textfile.close()

  } else {
  map = [[Block() for x in range(mapH)] for y in range(mapW)]
  startmap =    [[Block() for x in range(mapH)] for y in range(mapW)]
  map[2][2].btype = BlockType.wall
  }

*/



var Player = Class.create({
    initialize: function(uuid, position, isComputer, num, max_bombs, power) {
        this.uuid = uuid;
        this.computer = isComputer ? isComputer : false;
        this.start_position = position;
        this.position = position;
        this.max_bombs = max_bombs ? max_bombs : 1;
        this.power = power ? power : 1;
        this.bombinv = max_bombs;
        this.alive = true;
        this.num = num ? num : 0;
        
        if (this.computer) {
            this.repeat_move_delay = computer_move_delay;
        } else {
            this.repeat_move_delay = 0;
        }
    },

    reset: function() {
        this.max_bombs = 1;
        this.power = 1;
        this.bombinv = this.max_bombs;
        this.alive = true;
        this.position = this.start_position;
        if ( this.computer) {
            this.repeat_move_delay = computer_move_delay
        } else {
            this.repeat_move_delay = 0
        }
    },
    
    update: function(time) {
        var obj = get_object(this.position);
        
        if ( obj instanceof Powerup ) {
            this.use_powerup(obj);
            set_object(this.powerup.position, this);
        } else if (obj instanceof Explosion) {
            this.die();
        }
        
        if (this.repeat_move_delay > 0) {
            this.repeat_move_delay -= time;
        }
    },
    
    change_position: function(new_position) {
        if (this.repeat_move_delay > 0) {
            return;
        }

        if (!can_move(new_position) || new_position == this.position) {
            return;
        }

        if (get_object(this.position) instanceof Player) {
            set_object(this.position, null);
        }

        obj = get_object(new_position);

        if ( obj instanceof Powerup ) {
            this.use_powerup(obj);
        } else if ( obj instanceof Explosion ) {
            this.die();
        }

        set_object(new_position, this);
        this.position = new_position;

        if ( this.computer) {
            this.repeat_move_delay = computer_move_delay;
        } else {
            this.repeat_move_delay = player_move_delay;
        }
    },

    move: function(dir) {

        new_position = this.position.slice(0);
        if ( dir == Direction.right ) {
            new_position[0] += 1
        } else if ( dir == Direction.left ) {
            new_position[0] -= 1
        } else if ( dir == Direction.up ) {
            new_position[1] -= 1
        } else if ( dir == Direction.down ) {
            new_position[1] += 1
        }

        this.change_position(new_position);

    },

    use_powerup: function(obj) {
        if ( obj.type == 0 ) {
            this.powerup_bomb();
        } else {
            this.powerup_power();
        }
        powerups.remove(obj);
    },
    
    drop_bomb: function() {
        if (this.bombinv > 0) {
            b = new Bomb(this.power, this.position, this);
            bombs.add(b);

            this.bombinv = this.bombinv - 1;
            set_object(this.position, b);
        }
    },

    recharge_bomb: function(num) {
        num = num ? num : 1;
        if ( this.bombinv + num <= this.max_bombs ) {
            this.bombinv = this.bombinv + num;
        }
    },

    powerup_power: function(num) {
        num = num ? num : 1;
        this.power += num;
    },

    powerup_bomb: function(num) {
        num = num ? num : 1;
        this.max_bombs += num;
        this.bombinv += num;
    },
    
    die: function() {
        this.alive = false;
        // global humans, computers

        // computers.remove(this);
        humans.remove(this);
        delete players_by_id[this.uuid];
    },
});

var Powerup = Class.create({
    initialize: function(pos, type) {
        this.type = type
        this.position = pos
    }
});

var powerup_proportion = 0.3;

function random_powerup(pos) {
    return new Powerup(pos, Math.floor(Math.random()*2));
}

var render_map = null;

function draw_map() {
    for (var i=0; i<mapW; i++) {
        for (var j=0; j<mapH; j++) {
            render_map[i][j] = map[i][j].btype;
        }
    }
}

function draw_powerups() {
    var arr = powerups.array();
    for (var i=0; i<arr.length; i++) {
        var p = arr[i].position;
        render_map[p[0]][p[1]] = arr[i].type + BoxType.powerup_0;
    }
}

function draw_bombs() {
    var arr = bombs.array();
    for (var i=0; i<arr.length; i++) {
        var p = arr[i].position;
        render_map[p[0]][p[1]] = BoxType.bomb;
    }
}

function draw_players() {
    var arr = humans.array();
    for (var i=0; i<arr.length; i++) {
        var p = arr[i].position;
        render_map[p[0]][p[1]] = BoxType.player;
    }
}

function draw_explosions() {
    var arr = explosions.array();
    for (var i=0; i<arr.length; i++) {
        var ps = arr[i].exploded_positions;
        for (var j=0; j<ps.length; j++) {
            var p = ps[j];
            render_map[p[0]][p[1]] = BoxType.explosion;
        }
    }
}

function draw_stuff() {
    render_map = new Array(mapW);

    for (var i=0; i<mapW; i++) {
        render_map[i] = new Array(mapH);
        for (var j=0; j<mapH; j++) {
            render_map[i][j] = BoxType.blank;
        }
    }

    draw_map();
    draw_powerups();
    draw_bombs();
    draw_players();
    draw_explosions();

    return render_map;
}

generate_map();
var p = new Player(10, [1,1]);
var b = new Bomb(5, [5,5], p);

humans.add(p);
bombs.add(b);

map_objects[p.position[0]][p.position[1]] = p;
map_objects[b.position[0]][b.position[1]] = p;


var Update = Class.create({
    initialize: function(uuid, type) {
        this.uuid = uuid;
        this.type = type;
    }
});

var player_updates = [];

function send_update(uuid, type) {
    var u = new Update(uuid, type);
    player_updates.push(u);
}

function perform_human_updates() {
    for(var i=0; i<player_updates.length; i++) {
        var u = player_updates[i];
        var p = players_by_id[u.uuid];
        if (u.type < 4) {
            p.move(u.type);
        } else if(u.type == UpdateType.bomb) {
            p.drop_bomb();
        }
    }

    player_updates = [];
    
}


function update_bombs(t) {
    var arr = bombs.array();
    for (var i=0; i<arr.length; i++) {
        arr[i].update(t);
    }
}

function update_humans(t) {
    var arr = humans.array();
    for (var i=0; i<arr.length; i++) {
        arr[i].update(t);
    }
}

function update_explosions(t) {
    var arr = explosions.array();
    for (var i=0; i<arr.length; i++) {
        arr[i].update(t);
    }
}


function update_stuff(t) {
    perform_human_updates();
    
    update_bombs(t);
    update_explosions(t);
    update_humans(t);
}

exports.draw_stuff = draw_stuff;
exports.send_update = send_update;
exports.update_stuff = update_stuff;
