const dat = require('../vendor/dat.gui.min');
const TweenMax = require('gsap');
const Stats = require('../vendor/stats.min');

import { Program, ArrayBuffer } from 'tubugl-core';
import { SwapRenderer } from '../../src/index';

const vertexShader = `
attribute vec4 position;

uniform sampler2D uTexture;

void main() {
    vec4 pos = texture2D(uTexture, position.zw);
    gl_Position = vec4(position.xy + pos.xy, 0.0, 1.0);
    gl_PointSize = 10.0;
}`;

const fragmentShader = `
precision mediump float;

void main() {
    float alpha = clamp( 4.0 * (1.0 - distance(gl_PointCoord, vec2(0.5))/0.5 ), 0.0, 1.0);
    if(alpha < 0.001 ) discard;

    gl_FragColor = vec4(1.0, 1.0, 1.0, alpha);
}
`;

const positionFragmentSrc = `
precision mediump float;

uniform sampler2D uTexture;
varying vec2 vUv;

void main(){
	vec4 textureColor = texture2D( uTexture, vec2(vUv.x, 1.0 - vUv.y) );
	textureColor.x += (vUv.x - 0.5)/100.;
	textureColor.y += -(vUv.y - 0.5)/100.;
    
    gl_FragColor = textureColor;
}
`;

export default class App {
	constructor(params = {}) {
		this._isMouseDown = false;
		this._width = params.width ? params.width : window.innerWidth;
		this._height = params.height ? params.height : window.innerHeight;

		this.canvas = document.createElement('canvas');
		this.gl = this.canvas.getContext('webgl', { antialias: true });

		if (!this.gl.getExtension('OES_texture_float')) {
			let ext = this.gl.getExtension('OES_texture_half_float');
			this._isFloatTexture = false;
			if (!ext) throw new Error('This sddemo requires the OES_texture_float extension');
		} else {
			this._isFloatTexture = true;
		}

		if (params.isDebug) {
			this.stats = new Stats();
			document.body.appendChild(this.stats.dom);
			this._addGui();
		} else {
			let descId = document.getElementById('tubugl-desc');
			descId.style.display = 'none';
		}

		this._makeProgram();
		this.resize(this._width, this._height);
	}

	_addGui() {
		this.gui = new dat.GUI();
		this.playAndStopGui = this.gui.add(this, '_playAndStop').name('pause');
		this._isDebugView = true;
		this.DebugViewGui = this.gui
			.add(this, '_isDebugView')
			.name('isDebugView')
			.onChange(() => {});
	}

	_makeProgram() {
		let program = new Program(this.gl, vertexShader, fragmentShader);
		let particleNum = 16 * 16;
		let positions = [];

		for (let ii = 0; ii < particleNum; ii++) {
			positions[4 * ii + 0] = (ii % 16) / 16 * 1.4 - 0.7;
			positions[4 * ii + 1] = parseInt(ii / 16) / 16 * 1.4 - 0.7;
			positions[4 * ii + 2] = (ii % 16) / 16;
			positions[4 * ii + 3] = parseInt(ii / 16) / 16;
		}

		positions = new Float32Array(positions);
		let positionBuffer = new ArrayBuffer(this.gl, positions);
		positionBuffer.setAttribs('position', 4);

		this._obj = {
			program: program,
			positionBuffer: positionBuffer,
			count: particleNum
		};

		this._swapRenderer = new SwapRenderer(
			this.gl,
			{
				fragmentShaderSrc: positionFragmentSrc,
				isDebug: true,
				isFloatTexture: this._isFloatTexture
			},
			32,
			32
		);

		this._swapRenderer.setSize(window.innerWidth - 256 - 30, 20, 256, 256);
	}

	animateIn() {
		this.isLoop = true;
		TweenMax.ticker.addEventListener('tick', this.loop, this);
	}

	loop() {
		if (this.stats) this.stats.update();

		this._swapRenderer.update();

		this.gl.clearColor(0, 0, 0, 1);
		this.gl.clear(this.gl.COLOR_BUFFER_BIT);
		this.gl.viewport(0, 0, this._width, this._height);

		this._obj.program.bind();
		this._obj.positionBuffer.bind().attribPointer(this._obj.program);
		this.gl.enable(this.gl.BLEND);
		this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE);
		this.gl.drawArrays(this.gl.POINTS, 0, this._obj.count);

		if (this._isDebugView) this._swapRenderer.renderDebugView();

		this._swapRenderer.swap();
	}

	animateOut() {
		TweenMax.ticker.removeEventListener('tick', this.loop, this);
	}

	mouseMoveHandler(mouse) {
		if (!this._isMouseDown) return;

		this._prevMouse = mouse;
	}

	mouseDownHandler(mouse) {
		this._isMouseDown = true;
		this._prevMouse = mouse;
	}

	mouseupHandler() {
		this._isMouseDown = false;
	}

	onKeyDown(ev) {
		switch (ev.which) {
			case 27:
				this._playAndStop();
				break;
		}
	}

	_playAndStop() {
		this.isLoop = !this.isLoop;
		if (this.isLoop) {
			TweenMax.ticker.addEventListener('tick', this.loop, this);
			this.playAndStopGui.name('pause');
		} else {
			TweenMax.ticker.removeEventListener('tick', this.loop, this);
			this.playAndStopGui.name('play');
		}
	}
	

	resize(width, height) {
		this._width = width;
		this._height = height;

		this.canvas.width = this._width;
		this.canvas.height = this._height;
		this.gl.viewport(0, 0, this._width, this._height);

		this._swapRenderer.setSize(window.innerWidth - 256 - 30, 20, 256, 256);
	}

	destroy() {}
}
