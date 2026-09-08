(function(){
	var canvas = document.getElementById('cubeCanvas');
	var ctx = canvas.getContext('2d');
	var W = canvas.width, H = canvas.height;
	var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	var verts = [
		[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],
		[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]
	];
	var edges = [
		[0,1],[1,2],[2,3],[3,0],
		[4,5],[5,6],[6,7],[7,4],
		[0,4],[1,5],[2,6],[3,7]
	];

	function accentColor(){
		return getComputedStyle(document.documentElement).getPropertyValue('--accent-2').trim() || '#5cc9bd';
	}
	function gridColor(){
		return getComputedStyle(canvas).getPropertyValue('--bs-border-color').trim() || 'rgba(255,255,255,.15)';
	}

	var ay = 0, ax = 0.5, frame = 0;
	var frameEl = document.getElementById('frameCount');
	var rotEl = document.getElementById('rotY');

	function project(p){
		var scale = 62, fov = 4;
		var z = p[2] + fov;
		var x = (p[0] / z) * scale * fov;
		var y = (p[1] / z) * scale * fov;
		return [W/2 + x, H/2 + y];
	}

	function rotate(p, ax, ay){
		var y = p[1]*Math.cos(ax) - p[2]*Math.sin(ax);
		var z = p[1]*Math.sin(ax) + p[2]*Math.cos(ax);
		var x = p[0]*Math.cos(ay) + z*Math.sin(ay);
		var z2 = -p[0]*Math.sin(ay) + z*Math.cos(ay);
		return [x, y, z2];
	}

	function draw(){
		ctx.clearRect(0,0,W,H);

		ctx.strokeStyle = gridColor();
		ctx.lineWidth = 1;
		ctx.globalAlpha = 0.5;
		for(var gx=0; gx<=W; gx+=30){ ctx.beginPath(); ctx.moveTo(gx,0); ctx.lineTo(gx,H); ctx.stroke(); }
		for(var gy=0; gy<=H; gy+=30){ ctx.beginPath(); ctx.moveTo(0,gy); ctx.lineTo(W,gy); ctx.stroke(); }
		ctx.globalAlpha = 1;

		var rotated = verts.map(function(v){ return rotate(v, ax, ay); });
		var projected = rotated.map(project);

		ctx.strokeStyle = accentColor();
		ctx.lineWidth = 1.6;
		edges.forEach(function(e){
			var a = projected[e[0]], b = projected[e[1]];
			ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
		});

		ctx.fillStyle = accentColor();
		projected.forEach(function(p){
			ctx.beginPath(); ctx.arc(p[0], p[1], 2.2, 0, Math.PI*2); ctx.fill();
		});
	}

	function tick(){
		frame++;
		ay += 0.012;
		frameEl.textContent = String(frame).padStart(4,'0');
		rotEl.textContent = (ay % (Math.PI*2)).toFixed(2);
		draw();
		if(!reduced) requestAnimationFrame(tick);
	}

	if(reduced){ draw(); } else { requestAnimationFrame(tick); }
})();
