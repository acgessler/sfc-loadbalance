

	// export LoadBalanceMode() entry point to jQuery
	var LoadBalanceMode;
	
	// export UpdateVisualization() entry point to jQuery
	var UpdateVisualization;

	var LOAD_BALANCE_MODE_NONE = 0;
	var LOAD_BALANCE_MODE_SFC  = 1;
	var LOAD_BALANCE_MODE_KD   = 2;
		
		

// bind to jQuery
$(document).ready(function() {
	$( "#pick-mode" ).buttonset();
	
	$("#check").button();
	$("#check").click(function() {
		UpdateVisualization($(this).is(':checked'));
	});
	
	$('#radio1').click(function() {
		LoadBalanceMode(LOAD_BALANCE_MODE_NONE);
	});
	
	$('#radio2').click(function() {
		LoadBalanceMode(LOAD_BALANCE_MODE_SFC);
	});
	
	$('#radio3').click(function() {
		LoadBalanceMode(LOAD_BALANCE_MODE_KD);
	}); 
});

    

function run() {

	var initial_data = [
	
		[
		"--------",
		"--------",
		"---0----",
		"--030---",
		"--------",
		"--------",
		"--------",
		"--------"
		],
		
		[
		"--------",
		"--------",
		"-000----",
		"--000---",
		"--------",
		"--------",
		"--------",
		"--------"
		],
		
		[
		"--------",
		"---00---",
		"--00----",
		"--111---",
		"--------",
		"--------",
		"--------",
		"--------"
		],
		
		[
		"---22---",
		"--220---",
		"11------",
		"1111----",
		"--------",
		"--------",
		"--------",
		"--------"
		],
		
		[
		"--------",
		"----2---",
		"1---2---",
		"11------",
		"--------",
		"--------",
		"-----33-",
		"--------"
		],
		
		[
		"--------",
		"----2---",
		"-11-----",
		"-11-----",
		"--------",
		"--------",
		"----33--",
		"----133-"
		],
		
		[
		"--------",
		"----2---",
		"1---2---",
		"11-333--",
		"--------",
		"--------",
		"---33---",
		"--------"
		],
		
		[
		"--------",
		"----2---",
		"-11-----",
		"-11-----",
		"--------",
		"--------",
		"----333--",
		"--------"
		]
	];
	
	var movement_vectors = [
		[1,1,0],
		[0,1,0],
		[1,0,1],
		[1,-1,-1]
	];
	
	// number of cells on each axis
	var NUM_CELLS = 8;
	
	// number of workers to distribute load to
	var NUM_WORKERS = 4;


	medea.Ready("canvas",{dataroot:'medea/data'},['debug','keycodes', 'standardmesh', 'simpleanim'],function() {
	
		// -----------------------------------------------------
		var GetOutlineVertices =  function() {
			return [ 
					 // Front face
				  -1.0, -1.0,  1.0,
				   1.0, -1.0,  1.0,
				   
				   1.0, -1.0,  1.0,
				   1.0,  1.0,  1.0,
				   
				   1.0,  1.0,  1.0,
				  -1.0,  1.0,  1.0,
				  
				  -1.0,  1.0,  1.0,
				  -1.0, -1.0,  1.0,
				  
				  // Back face
				  -1.0, -1.0, -1.0,
				  -1.0,  1.0, -1.0,
				  
				  -1.0,  1.0, -1.0,
				   1.0,  1.0, -1.0,
				   
				   1.0,  1.0, -1.0,
				   1.0, -1.0, -1.0,
				   
				   1.0, -1.0, -1.0,
				  -1.0, -1.0, -1.0,
				   
				  // Top face
				  -1.0,  1.0, -1.0,
				  -1.0,  1.0,  1.0,
				  
				   1.0,  1.0,  1.0,
				   1.0,  1.0, -1.0,

				  // Bottom face
				  -1.0,  -1.0, -1.0,
				  -1.0,  -1.0,  1.0,
				  
				   1.0,  -1.0,  1.0,
				   1.0,  -1.0, -1.0,
			]; 
		};
		
		
		// -----------------------------------------------------
		var GetHilbertVertices = function() {
			out = [];
			
			var num_points = NUM_CELLS * NUM_CELLS* NUM_CELLS;
			for(var i = 0; i < num_points; ++i) {
				var point = hilbert.point(3,3,i); 
				out.push(point[0]);
				out.push(point[1]);
				out.push(point[2]);
				
				point = hilbert.point(3,3,(i+1) % num_points); 
				out.push(point[0]);
				out.push(point[1]);
				out.push(point[2]);
			}
			
			return out;
		};
		
		
		// -----------------------------------------------------
		var GetHilbertColors = function() {
			out = [];
			
			var num_points = NUM_CELLS * NUM_CELLS* NUM_CELLS;
			for(var i = 0; i < num_points; ++i) {
				out.push(i/num_points);
				out.push(1.0 - i/num_points);
				out.push(1.0 - i/num_points);
				
				out.push(i/num_points);
				out.push(1.0 - i/num_points);
				out.push(1.0 - i/num_points);
			}
			
			return out;
		};
		
		
		// -----------------------------------------------------
		var DiscretePositionToLocal = function(x,y,z) {
			if(x instanceof Array) {
				y = x[1];
				z = x[2];
				x = x[0];
			}
			return vec3.create([(x-(NUM_CELLS-1)/2)*3,(y-(NUM_CELLS-1)/2)*3,(z-(NUM_CELLS-1)/2)*3]);
		};
		

		// -----------------------------------------------------
		var DiscreteVectorToLocal = function(x,y,z) {
			if(x instanceof Array) {
				y = x[1];
				z = x[2];
				x = x[0];
			}
			return vec3.create([x*3,y*3,z*3]);
		};
		
		
		// -----------------------------------------------------
		var CreateCubeMeshes = function() {
			
			// create the color palette for the cubes. Shader compilation is then done
			// asynchronously while we compute the Hilbert curve.
			var materials = [
				medea.CreateSimpleMaterialFromColor([250/255.0,126/255.0,211/255.0], true),
				medea.CreateSimpleMaterialFromColor([212/255.0,255/255.0,102/255.0], true),
				medea.CreateSimpleMaterialFromColor([127/255.0,250/255.0,248/255.0], true),
				medea.CreateSimpleMaterialFromColor([170/255.0,170/255.0,170/255.0], true)
			];
			
			if(materials.length !== NUM_WORKERS) {
				alert(NUM_WORKERS);
			}
			
			// TODO: redesign medea API so this is no longer needed.
			//  (without it, standardmesh API functions would be available, but not
			//   constants such as medea.STANDARD_MESH_HARD_NORMALS)
			medea._initMod('standardmesh');
			
			
			// create a prefab mesh for every cube color, but share GL resources
			var cube_meshes = [
				medea.CreateStandardMesh_Cube(materials[0], 
					medea.STANDARD_MESH_HARD_NORMALS)
			];
			
			for(var i = 1; i < NUM_WORKERS;++i) {
				cube_meshes.push(medea.CloneMesh(cube_meshes[0], materials[i]));
			}
			
			for(var i = 0; i < NUM_WORKERS;++i) {
				cube_meshes[i].Tag('cube_mesh');
			}
			return cube_meshes;
		};
		
		
		// -----------------------------------------------------
		// -----------------------------------------------------
		
		var vp1 = medea.CreateViewport();
		vp1.ClearColor([39/255.0,41/255.0,46/255.0]);
     
		
        var root = medea.RootNode();
		var cube_meshes = CreateCubeMeshes();
		
		// create another node to attach the whole 3D scene to
		var scene_root = medea.CreateNode();
		root.AddChild(scene_root);
		
	
		
		// create mesh for the outline of the simulation area
		var outline_mesh = medea.CreateSimpleMesh(GetOutlineVertices(),
			null,
			medea.CreateSimpleMaterialFromColor([0.8,0.8,0.8]),
			0
		);

		outline_mesh.PrimitiveType(medea.PT_LINES);
		
		var outline_node = medea.CreateNode();
		outline_node.AddEntity(outline_mesh);
		outline_node.Scale(1.5 * NUM_CELLS);
		scene_root.AddChild(outline_node);
		
		// create mesh for the hilbert curve
		var hilbert_vertices = GetHilbertVertices();
		var hilbert_mesh = medea.CreateSimpleMesh(
			{
				positions: 	hilbert_vertices,
				colors: 	[
					GetHilbertColors()
				]
			},
			null,
			medea.CreateSimpleMaterialFromVertexColor(),
			0
		);

		hilbert_mesh.PrimitiveType(medea.PT_LINES);
		
		var hilbert_node = medea.CreateNode();
		hilbert_node.AddEntity(hilbert_mesh);
		hilbert_node.Translate(DiscretePositionToLocal([0,0,0]));
		hilbert_node.Scale(3);
		
		scene_root.AddChild(hilbert_node);
		
		
		// -----------------------------------------------------
		// Initial grid initialization, returns occupation array
		var InitializeCells = function() {
			var occupation  = [
			];
		
			// create NUM_CELLS^3 cube of cubes
			var n = 1;
			for (var x = 0; x < NUM_CELLS; ++x) {
				var xa = [];
				occupation.push(xa);
				for (var y = 0; y < NUM_CELLS; ++y) {
					var ya = [];
					xa.push(ya);
					for (var z = 0; z < NUM_CELLS; ++z) {
						var slice = initial_data[z];
						var symbol = slice[y][x];
						if(symbol === '-') {
							ya.push([]);
							continue;
						}
						
	
						var move = movement_vectors[symbol - '0'];
						
						var nd = medea.CreateNode(n++);
						ya.push([{
							  node 				: nd
							, symbol			: symbol - '0'
							, worker_index 		: 0
							, movement_vector	: [ 
									  move[0]
									, move[1]
									, move[2]
								]
							}
						]);
						
						var mesh = cube_meshes[0];
						
						nd.AddEntity(mesh);
						nd.Translate(DiscretePositionToLocal(x,y,z));
						
						scene_root.AddChild(nd);
					}
				}
			}
			return occupation;
		};
		
		
		// -----------------------------------------------------
		var ClearCells = function(occupation) {
		
			for (var x = 0; x < NUM_CELLS; ++x) {
				var xa = occupation[x];
				for (var y = 0; y < NUM_CELLS; ++y) {
					var ya = xa[y];
					for (var z = 0; z < NUM_CELLS; ++z) {
					
						var cell = ya[z];
						for(var i = 0; i < cell.length; ++i) {
							scene_root.RemoveChild(cell[i].node);
						}
					}
				}
			}
		};
		
		
		var current_step = 0;
		
		// -----------------------------------------------------
		// Advance the given cell by `delta` steps.
		// Return whether the cell is visible now, or if not,
		// whether another cell became visible.
		var StepCell = function(delta, occupation, current_cell, x, y, z, handled) {
			if(current_cell.length === 0) {
				return 0;
			}
		
			var visible = 1;
			for(var i = 0; i < current_cell.length; ++i) {
			
				if(i > 0)break;
			
				var node = current_cell[i].node;
				if(node.Name() in handled) {
					continue; 
				}
				
				var vec = current_cell[i].movement_vector;
				var pos = [x,y,z];
				
				// handle ping-pong end conditions
				for(var j = 0; j < 3; ++j) {
					if(pos[j] === NUM_CELLS-1 && vec[j] * delta > 0) {
						vec[j] = -vec[j];
					}
					if(pos[j] === 0 && vec[j] * delta < 0) {
						vec[j] = -vec[j];
					}
				}
				
				pos[0] += vec[0] * delta;
				pos[1] += vec[1] * delta;
				pos[2] += vec[2] * delta;
				

				if(!(pos[0] != x || pos[1] != y || pos[2] != z)) {
					alert('block not moved');
				}
			
					
				var shortcut = occupation[ pos[0] ][ pos[1] ];
				shortcut[ pos[2] ].push(current_cell[i]);
				
				// check if the target spot is occupied, if so, temporarily hide this cube
				// and add it to the target spot's waiting list.
				if (shortcut[ pos[2] ].length > 1) {
					if(current_cell[i].node.Enabled()) {
						--visible;
						//current_cell[i].node.Enabled(false);
					}
				}
				
				// register animator to slowly move to target position. Also setup a finishing
				// callback to avoid changing the cube color before we've reached final position.
				//
				// this is also necessary because worker_index is updated by LoadBalance(),
				// which is called after StepCell() returns.
				var anim = medea.CreateFromToAnimator(node.LocalPos(), DiscretePositionToLocal(pos), 0.5, true);
				anim.FinishingCallback( (function(cell) { 
						return function() {
							cell.node.RemoveAllEntities('cube_mesh');
							cell.node.AddEntity(cube_meshes[cell.worker_index]);
						};
					}) (current_cell[i])
				);
				
				node.AddEntity(anim);
				handled[node.Name()] = true;
				
				current_cell.shift();
				--i;
			}
			
			// activate the next node in our own waiting list, if any
			if(current_cell.length > 0) {
				if(!current_cell[0].node.Enabled()) {
					++visible;
					//current_cell[0].node.Enabled(true);
				}
			}
			
			return visible;
		}
		
		
		// -----------------------------------------------------
		var CountLoads = function(occupation) {
	
			var count_loads = 0;
			for (var x = 0; x < NUM_CELLS; ++x) {
				var xa = occupation[x];
				for (var y = 0; y < NUM_CELLS; ++y) {
					var ya = xa[y];
					for (var z = 0; z < NUM_CELLS; ++z) {
					
						var cell = ya[z];
						if(cell.length === 0) {
							continue;
						}
						
						++count_loads;
					}
				}
			}
			
			return count_loads;
		}
		
		
		// -----------------------------------------------------
		// Do load balancing using SFC
		var LoadBalanceSFC = function(occupation) {
			
			var curve_len = NUM_CELLS * NUM_CELLS * NUM_CELLS;
			
			// first determine how many active loads there are and what the fair share is
			var count_loads = CountLoads(occupation);
			
			var loads_handled = 0;
			var worker_index = 0;
			var fair_share = Math.floor(count_loads/NUM_WORKERS);
			
			// then distribute them to the workers, following the hilbert curve
			for (var i = 0; i < curve_len; ++i) {
				if(loads_handled === count_loads) {
					return;
				}
				
				var curve_x = hilbert_vertices[i*6];
				var curve_y = hilbert_vertices[i*6 + 1];
				var curve_z = hilbert_vertices[i*6 + 2];
				
				var cell = occupation[curve_x][curve_y][curve_z];
				if(cell.length === 0) {
					continue;
				}
				
				if(loads_handled - worker_index * fair_share >= fair_share && worker_index < NUM_WORKERS-1) {
					++worker_index;
				}
				
				++loads_handled;
				
				var nd = cell[0].node;
				cell[0].worker_index = worker_index;
			} 
		};
		
		
		// -----------------------------------------------------
		// Do no load balancing at all - each node gets their
		// index in natural order assigned
		var LoadBalanceNone = function(occupation) {
		
			// first determine how many active loads there are and what the fair share is
			var count_loads = CountLoads(occupation);
				
			var loads_handled = 0;
			var worker_index = 0;
			var fair_share = Math.floor(count_loads/NUM_WORKERS);
			
			
			// then just assign them in natural order
			for (var x = 0; x < NUM_CELLS; ++x) {
				var xa = occupation[x];
				for (var y = 0; y < NUM_CELLS; ++y) {
					var ya = xa[y];
					for (var z = 0; z < NUM_CELLS; ++z) {
						if(loads_handled === count_loads) {
							return;
						}
					
						var cell = ya[z];
						if(cell.length === 0) {
							continue;
						}
						
						if(loads_handled - worker_index * fair_share >= fair_share && worker_index < NUM_WORKERS-1) {
							++worker_index;
						}
						
						++loads_handled;
				
						var nd = cell[0].node;
						cell[0].worker_index = worker_index;
					}
				}
			}
		};
		
		
		// -----------------------------------------------------
		var LoadBalance = function(occupation, first_time, update_meshes_immediately) {
			var mode = LoadBalanceMode();
			if(mode === LOAD_BALANCE_MODE_NONE) {
				if(first_time === true) {
					LoadBalanceNone(occupation);
				}
			}
			else if (mode === LOAD_BALANCE_MODE_SFC) {
				LoadBalanceSFC(occupation);
			}
			else {
				alert('load balancing mode not implemented');
			}
			
			if(update_meshes_immediately) {
				for (var x = 0; x < NUM_CELLS; ++x) {
					var xa = occupation[x];
					for (var y = 0; y < NUM_CELLS; ++y) {
						var ya = xa[y];
						for (var z = 0; z < NUM_CELLS; ++z) {
							var cell = ya[z];
							if(cell.length === 0) {
								continue;
							}
							
							cell[0].node.RemoveAllEntities('cube_mesh');
							cell[0].node.AddEntity(cube_meshes[cell[0].worker_index]);
						}
					}
				}
			}
		};
		
		
		// -----------------------------------------------------
		var EstimateCommunicationCost = function(occupation) {
			var cost = 0;
			for (var x = 0; x < NUM_CELLS; ++x) {
				var xa = occupation[x];
				for (var y = 0; y < NUM_CELLS; ++y) {
					var ya = xa[y];
					for (var z = 0; z < NUM_CELLS; ++z) {
					
						var current_cell = ya[z];
						if(current_cell.length === 0) {
							continue;
						}
						
						var my_worker_index = current_cell[0].worker_index;
					
						// check all neighbours of this cell
						for(var xd = -1; xd <= 1; ++xd) {
							if (x + xd < 0 || x + xd >= NUM_CELLS) {
								continue;
							}
									
							for(var yd = -1; yd <= 1; ++yd) {
								if (y + yd < 0 || y + yd >= NUM_CELLS) {
									continue;
								}
							
								for(var zd = -1; zd <= 1; ++zd) {
									if (xd == 0 && yd == 0 && zd == 0) {
										continue;
									}
									
									if (z + zd < 0 || z + zd >= NUM_CELLS) {
										continue;
									}
									
									var n = occupation[x + xd][y + yd][z + zd];
									if(n.length === 0) {
										continue;
									}
									if(my_worker_index !== n[0].worker_index) {
										++cost;
									}
								}
							}
						}
					}
				}
			}
			// we counted all twice
			return cost / 2
		};
		
		
		var stats = [];
		
		// -----------------------------------------------------
		var UpdateStats = function() {
			var cost = EstimateCommunicationCost(occupation);
			
			stats.push(cost);
			
			$('#com_cost_step').html(current_step);
			$('#com_cost').html(cost);
			
			var acc = 0;
			for(var i = 0; i < stats.length; ++i) {
				acc += stats[i];
			} 
			acc /= stats.length;
			
			$('#com_cost_avg').html(acc.toFixed(3));
			
			var avg = acc;
			acc = 0;
			for(var i = 0; i < stats.length; ++i) {
				acc += (stats[i] - avg) * (stats[i] - avg);
			} 
			acc = Math.sqrt(acc / stats.length);
			
			$('#com_cost_dev').html(acc.toFixed(3));
		};
		
		
		// -----------------------------------------------------
		// Advance the simulation by `delta` steps.
		var Step = function(delta, occupation) {
			current_step += delta;
			
			var handled = {};
			var count = 0;
			
			for (var x = 0; x < NUM_CELLS; ++x) {
				var xa = occupation[x];
				for (var y = 0; y < NUM_CELLS; ++y) {
					var ya = xa[y];
					for (var z = 0; z < NUM_CELLS; ++z) {
						count += StepCell(delta, occupation, ya[z], x, y, z, handled);
					}
				}
			}
			
			LoadBalance(occupation);
			UpdateStats(occupation);
		};
		
			
		var current_mode;
		var occupation;
		
		// -----------------------------------------------------
		/* global!*/ LoadBalanceMode = function(mode) {
			if(mode === undefined) {
				return current_mode;
			}
			
			stats = [];
			
			// always reset the scene
			current_mode = mode;
			
			if(occupation !== undefined) {
				ClearCells(occupation);
			}
			occupation = InitializeCells();
			LoadBalance(occupation, true, true);
			UpdateStats(occupation);
			
			UpdateVisualization();
		};
		
		var current_visualization_state = false;
		
		// -----------------------------------------------------
		/* global!*/ UpdateVisualization = function(on_off) {
		
			if(on_off === undefined) {
				on_off = current_visualization_state;
			}
			
			var mode = LoadBalanceMode();
			hilbert_node.Enabled(on_off === true && mode === LOAD_BALANCE_MODE_SFC);
		};
		
		
		// add primary camera and setup view position
		var cam = medea.CreateCameraNode();
		root.AddChild(cam);
		vp1.Camera(cam);
		
		cam.Translate(vec3.create([15,15,35]));
		cam.Rotate(0.45, [0,1,0]);
		cam.Rotate(-0.4, [1,0,0]);
			
		
		// and a plain camera controller to orbit the scene
		medea.FetchMods('camcontroller',function() {
			var cc = medea.CreateCamController('rotatex');
            scene_root.AddEntity(cc);
			cc.Enable();
		});
		
		var time = 0;
		var wait_for_arrow_release = false;
		
		
		// handle user input and update presentation accordingly
		medea.SetTickCallback(function(dtime) {
			time += dtime;
			
			// left arrow
			if (medea.IsKeyDown(37)) {
				if(wait_for_arrow_release === false) {
					Step(-1, occupation);
					wait_for_arrow_release = true;
				}
			}
			// right arrow
			else if (medea.IsKeyDown(39)) {
				if(wait_for_arrow_release === false) {
					Step(1, occupation);
					wait_for_arrow_release = true;
				}
			}
			else {
				wait_for_arrow_release = false;
			}
			return true;
		});	
		

		
		// init scene
		LoadBalanceMode (LOAD_BALANCE_MODE_NONE);
		
		
		// medea.SetDebugPanel(null,true);
		medea.Start();
	
	});
}
