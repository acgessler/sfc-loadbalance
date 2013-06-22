
$(document).ready(function() {
	$( "#pick-mode" ).buttonset();
});

function run() {

	var initial_data = [
	
		[
		"--------",
		"--------",
		"---0----",
		"--00----",
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
		"--------",
		"--------"
		],
		
		[
		"--------",
		"----2---",
		"-11-----",
		"-11-----",
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
		"--------",
		"--------"
		],
		
		[
		"--------",
		"----2---",
		"-11-----",
		"-11-----",
		"--------",
		"--------",
		"--------",
		"--------"
		]
	];
	
	var movement_vectors = [
		[1,1,0],
		[0,1,0],
		[1,0,1]
	];
	
	// number of cells on each axis
	var NUM_CELLS = 8;
	
	// number of workers to distribute load to
	var NUM_WORKERS = 3;


	medea.Ready("canvas",{dataroot:'medea/data'},['debug','keycodes', 'standardmesh'],function() {
	
		// -----------------------------------------------------
		var GetOutlineVertices = function() {
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
				out.push(0);
				out.push(1.0 - i/num_points);
				
				out.push(i/num_points);
				out.push(0);
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
				medea.CreateSimpleMaterialFromColor([127/255.0,250/255.0,248/255.0], true)
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
						
						var nd = medea.CreateNode(n++);
						ya.push([{
							node 	: nd,
							symbol	: symbol - '0'
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
			
				var node = current_cell[i].node;
				if(node.Name() in handled) {
					continue; 
				}
				var vec = movement_vectors[current_cell[i].symbol];
				
				var pos = [x,y,z];
				
				// prevent negative mod
				var positive_offset = (delta < 0 ? - delta : delta) * NUM_CELLS;
				pos[0] = (pos[0] + vec[0] * delta + positive_offset) % NUM_CELLS;
				pos[1] = (pos[1] + vec[1] * delta + positive_offset) % NUM_CELLS;
				pos[2] = (pos[2] + vec[2] * delta + positive_offset) % NUM_CELLS;
				
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
						current_cell[i].node.Enabled(false);
					}
				}
				
				current_cell.shift();
				--i;
	
				
				node.ResetTransform();
				node.Translate(DiscretePositionToLocal(pos));
				
				handled[node.Name()] = true;
			}
			
			// activate the next node in our own waiting list, if any
			if(current_cell.length > 0) {
				if(!current_cell[0].node.Enabled()) {
					++visible;
					current_cell[0].node.Enabled(true);
				}
			}
			
			return visible;
		}
		
		
		// -----------------------------------------------------
		// Do load balancing using SFC
		var LoadBalance = function() {
			
			var curve_len = NUM_CELLS * NUM_CELLS * NUM_CELLS;
			
			var count_loads = 0;
			for (var i = 0; i < curve_len; ++i) {
				var curve_x = hilbert_vertices[i*6];
				var curve_y = hilbert_vertices[i*6 + 1];
				var curve_z = hilbert_vertices[i*6 + 2];
				
				var cell = occupation[curve_x][curve_y][curve_z];
				if(cell.length === 0) {
					continue;
				}
				
				++count_loads;
			}
			
			var loads_handled = 0;
			var worker_index = 0;
			var fair_share = Math.floor(count_loads/NUM_WORKERS);
			
			
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
				nd.RemoveAllEntities();
				nd.AddEntity(cube_meshes[worker_index]);
			} 
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
			
			LoadBalance();
		};
		
		var occupation = InitializeCells();
		
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
        
		// medea.SetDebugPanel(null,true);
		medea.Start();
	});
}
