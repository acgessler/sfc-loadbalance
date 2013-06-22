
/* 
Direct JavaScript port of the 3D Hilbert curve from
https://github.com/cortesi/scurve/blob/master/scurve

I therefore assume no ownership on this code.

*/

hilbert = {};


(function (hilbert) {

	var lrot = function(x, i, width) {
		//assert x < 2**width
		i = i%width;
		x = (x<<i) | (x>>width-i);
		return x&((1<<width)-1);
	}

	var graycode = function(x) {
		return x^(x>>1);
	};
	
	
	var bitrange = function(x, width, start, end) {
		return x >> (width-end) & ((1 << (end-start))-1);
	};
	
	
	var itransform = function(entry, direction, width, x) {
		//assert x < 2**width
		//assert entry < 2**width
		return lrot(x, direction+1, width)^entry;
	}
	
	var direction = function(x, n) {
		// assert x < 2**n
		if (x === 0) {
			return 0;
		}
		if (x%2 === 0) {
			return tsb(x-1, n)%n;
		}
		return tsb(x, n)%n;
	};
	
	var entry = function(x) {
		if (x === 0) {
			return 0;
		}
		return graycode(2*((x-1)/2));
	};
	
	var tsb = function(x, width) {
		//assert x < 2**width
		i = 0
		while (x&1 && i <= width) {
			x = x >> 1;
			i += 1;
		}
		return i;
	};
	
	var setbit = function(x, w, i, b) {
		//assert b in [1, 0]
		//assert i < w
		if (b) {
			return x | (1 << (w-i-1));
		}
    
        return x & ~(1 << (w-i-1));
	};
	
	
	hilbert.point = function(dimension, order, h) {
		var hwidth = order*dimension;
		var e = 0;
		var d = 0;
		var p = []; 
		for(var i = 0; i < dimension; ++i) {
			p.push(0);
		}
		for(var i = 0; i < order; ++i) {
		
			var w = bitrange(h, hwidth, i*dimension, i*dimension+dimension);
			var l = graycode(w);
			var l = itransform(e, d, dimension, l);
			
			for(var j = 0; j < dimension; ++j) {
				b = bitrange(l, dimension, j, j+1);
				p[j] = setbit(p[j], order, i, b);
			}
			
			e = e ^ lrot(entry(w), d+1, dimension); 
			d = (d + direction(w, dimension) + 1)%dimension;
		}
		return p;
	};


})(hilbert);
