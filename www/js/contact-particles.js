(function(){
	var canvas = document.getElementById('contactParticles');
	if(!canvas) return;
	var ctx = canvas.getContext('2d');
	var W = canvas.width, H = canvas.height;
	var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	var LINK_DIST = 110;

	function accentColor(){
		return getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#e2a54d';
	}
	function accent2Color(){
		return getComputedStyle(document.documentElement).getPropertyValue('--accent-2').trim() || '#5cc9bd';
	}
	function hexToRgb(hex){
		var h = hex.replace('#','');
		if(h.length === 3){ h = h.split('').map(function(c){ return c+c; }).join(''); }
		var num = parseInt(h, 16);
		return (num >> 16 & 255) + ',' + (num >> 8 & 255) + ',' + (num & 255);
	}

	var colorA = hexToRgb(accentColor());
	var colorB = hexToRgb(accent2Color());

	var COUNT = 40;
	var particles = [];
	for(var i = 0; i < COUNT; i++){
		particles.push({
			x: Math.random() * W,
			y: Math.random() * H,
			vx: (Math.random() - 0.5) * 0.28,
			vy: (Math.random() - 0.5) * 0.28,
			r: 1.3 + Math.random() * 1.5,
			c: Math.random() < 0.5 ? colorA : colorB
		});
	}

	function step(){
		for(var i = 0; i < particles.length; i++){
			var p = particles[i];
			p.x += p.vx; p.y += p.vy;
			if(p.x < 0) p.x = W; if(p.x > W) p.x = 0;
			if(p.y < 0) p.y = H; if(p.y > H) p.y = 0;
		}
	}

	function draw(){
		ctx.clearRect(0, 0, W, H);

		ctx.lineWidth = 1;
		for(var i = 0; i < particles.length; i++){
			for(var j = i + 1; j < particles.length; j++){
				var a = particles[i], b = particles[j];
				var dx = a.x - b.x, dy = a.y - b.y;
				var d = Math.sqrt(dx * dx + dy * dy);
				if(d < LINK_DIST){
					ctx.strokeStyle = 'rgba(' + a.c + ',' + (0.22 * (1 - d / LINK_DIST)) + ')';
					ctx.beginPath();
					ctx.moveTo(a.x, a.y);
					ctx.lineTo(b.x, b.y);
					ctx.stroke();
				}
			}
		}

		for(var k = 0; k < particles.length; k++){
			var p = particles[k];
			ctx.beginPath();
			ctx.fillStyle = 'rgba(' + p.c + ',0.85)';
			ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
			ctx.fill();
		}
	}

	function tick(){
		step();
		draw();
		if(!reduced) requestAnimationFrame(tick);
	}

	if(reduced){ draw(); } else { requestAnimationFrame(tick); }
})();
