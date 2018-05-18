const TweenMax = require('gsap');
import { Program, ArrayBuffer } from 'tubugl-core';
import { SwapRenderer } from '../../src/index';

const vertexShader = `
attribute vec4 position;

uniform sampler2D uTexture;

void main() {
    vec4 pos = texture2D(uTexture, position.zw);
    gl_Position = vec4(pos.xy, 0.0, 1.0);
    gl_PointSize = 5.0;
}`;

const fragmentShader = `
precision mediump float;

void main() {
    float alpha = clamp( 4.0 * (1.0 - distance(gl_PointCoord, vec2(0.5))/0.5 ), 0.0, 1.0);
    if(alpha < 0.001 ) discard;

    gl_FragColor = vec4(1.0, 1.0, 1.0, alpha);
}
`;

const velocityFragmentSrc = `
precision mediump float;

uniform sampler2D positionTexture;
uniform sampler2D uTexture;

varying vec2 vUv;

void main(){
	vec4 textureColor = texture2D(uTexture, vec2(vUv.x, 1.0 - vUv.y));
	vec4 positonTextureColor = texture2D(positionTexture, vec2(vUv.x, 1.0 - vUv.y));
	
	if(positonTextureColor.y > 0.0) textureColor.y *= mix(0.99, 0.5,  positonTextureColor.y );
	else 							textureColor.y += 0.001;

	gl_FragColor = textureColor;
}
`;

const positionFragmentSrc = `
precision mediump float;

uniform sampler2D velocityTexture;
uniform sampler2D uTexture;

varying vec2 vUv;

void main(){
	vec2 customUv = vec2(vUv.x, 1.0 - vUv.y);
	vec4 velocityTextureColor = texture2D( velocityTexture, customUv );
	vec4 textureColor = texture2D( uTexture, customUv );
	textureColor.y = velocityTextureColor.y + textureColor.y;
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

		if (!this.gl.getExtension('OES_texture_float'))
			throw new Error('This sddemo requires the OES_texture_float extension');

		if (params.isDebug) {
			// this.stats = new Stats();
			// document.body.appendChild(this.stats.dom);
			// this._addGui();
		} else {
			let descId = document.getElementById('tubugl-desc');
			descId.style.display = 'none';
		}

		this._makeProgram();
		this.resize(this._width, this._height);
	}

	_addGui() {
		// this.gui = new dat.GUI();
		// this.playAndStopGui = this.gui.add(this, '_playAndStop').name('pause');
		// this._isDebugView = true;
		// this.DebugViewGui = this.gui
		// 	.add(this, '_isDebugView')
		// 	.name('isDebugView')
		// 	.onChange(() => {});
	}

	_makeProgram() {
		let program = new Program(this.gl, vertexShader, fragmentShader);
		let particleNum = 32 * 32;
		let positions = [];

		let side = 32;

		for (let ii = 0; ii < particleNum; ii++) {
			positions[4 * ii + 0] = (ii % side) / side * 1 - 0.5;
			positions[4 * ii + 1] = parseInt(ii / side) / side * 1 - 0.5;
			positions[4 * ii + 2] = (ii % side) / side;
			positions[4 * ii + 3] = parseInt(ii / side) / side;
		}

		positions = new Float32Array(positions);
		let positionBuffer = new ArrayBuffer(this.gl, positions);
		positionBuffer.setAttribs('position', 4);

		this._obj = {
			program: program,
			positionBuffer: positionBuffer,
			count: particleNum
		};

		this._velocitySwapRenderer = new SwapRenderer(
			this.gl,
			{
				fragmentShaderSrc: velocityFragmentSrc,
				isDebug: true,
				isFloatTexture: this._isFloatTexture
			},
			32,
			32
		);

		let dataArray = [];
		for (let ii = 0; ii < 32 * 32; ii++) {
			dataArray[4 * ii + 0] = 2 * Math.random() - 1;
			dataArray[4 * ii + 1] = -2 * Math.random();
			dataArray[4 * ii + 2] = 0;
			dataArray[4 * ii + 3] = 1;
		}
		dataArray = new Float32Array(dataArray);

		this._swapRenderer = new SwapRenderer(
			this.gl,
			{
				fragmentShaderSrc: positionFragmentSrc,
				isDebug: true,
				dataArray: dataArray,
				isFloatTexture: this._isFloatTexture
			},
			32,
			32
		);

		this._swapRenderer.setSize(window.innerWidth - 128 - 30, 20, 128, 128);
		this._velocitySwapRenderer.setSize(window.innerWidth - 128 * 2 - 40, 20, 128, 128);
	}

	animateIn() {
		this.isLoop = true;
		TweenMax.ticker.addEventListener('tick', this.loop, this);
	}

	loop() {
		if (this.stats) this.stats.update();

		this._velocitySwapRenderer.update({
			positionTexture: this._swapRenderer.getReadTexture()
		});

		this._swapRenderer.update({
			velocityTexture: this._velocitySwapRenderer.getCurrentTexture()
		});

		this.gl.clearColor(0, 0, 0, 1);
		this.gl.clear(this.gl.COLOR_BUFFER_BIT);
		this.gl.viewport(0, 0, this._width, this._height);

		this._obj.program.bind();
		this._obj.positionBuffer.bind().attribPointer(this._obj.program);

		let texture = this._swapRenderer.getCurrentTexture();
		this._obj.program.setUniformTexture(texture, 'uTexture');
		texture.activeTexture().bind();

		this.gl.enable(this.gl.BLEND);
		this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE);
		this.gl.drawArrays(this.gl.POINTS, 0, this._obj.count);

		if (this._isDebugView) {
			this._velocitySwapRenderer.renderDebugView();
			this._swapRenderer.renderDebugView();
		}
		this._velocitySwapRenderer.swap();
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
			// this.playAndStopGui.name('pause');
		} else {
			TweenMax.ticker.removeEventListener('tick', this.loop, this);
			// this.playAndStopGui.name('play');
		}
	}

	resize(width, height) {
		this._width = width;
		this._height = height;

		this.canvas.width = this._width;
		this.canvas.height = this._height;
		this.gl.viewport(0, 0, this._width, this._height);

		// this._swapRenderer.setSize(window.innerWidth - 256 - 30, 20, 256, 256);

		this._swapRenderer.setSize(window.innerWidth - 128 - 30, 20, 128, 128);
		this._velocitySwapRenderer.setSize(window.innerWidth - 128 * 2 - 40, 20, 128, 128);
	}

	destroy() {}
}
