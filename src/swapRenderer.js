import { Program, ArrayBuffer, FrameBuffer } from 'tubugl-core';
import { FLOAT, TRIANGLES, BLEND, ONE, ZERO } from 'tubugl-constants';

const vertexShader = `
precision mediump float;

attribute vec4 position;

uniform float uWindowRate;

varying vec2 vUv;

void main() {
	float x = mix(-1., 1.0 + uWindowRate * 2.0, position.x);
	float y = mix(-1., 1.0 + 1.0/uWindowRate * 2.0, position.y);
	float uvX = mix(0., 1.0 + uWindowRate, position.x);
	float uvY = 1.0 - mix(0., 1.0 + 1.0/uWindowRate, position.y);

	gl_Position = vec4(x, y, position.z, 1.0);
	vUv = vec2(uvX, uvY);
}`;

const debugFragmentShader = `
precision mediump float;

varying vec2 vUv;

uniform sampler2D uTexture;

void main(){
	gl_FragColor = vec4(texture2D( uTexture, vUv).rgb, 1.0);
}`;

export class SwapRenderer {
	/**
	 *
	 * @param {webGlContext} gl
	 * @param {{fragmentShaderSrc: string, isDebug: boolean}} params
	 * @param {*} width
	 * @param {*} height
	 */
	constructor(gl, params, width = 128, height = 128) {
		this._gl = gl;
		this._width = width;
		this._height = height;

		this.debugSize = {
			x: 30,
			y: 30,
			width: 64,
			height: 64
		};
		this.isDebug = params.isDebug;

		this._makeProgram(params);
		this._makeFramebuffer();

		if (params.isDebug) this._makeDebugProgram();
	}

	setSize(x, y, width, height) {
		if (x) this.debugSize.x = x;
		if (y) this.debugSize.y = y;
		if (width) this.debugSize.width = width;
		if (height) this.debugSize.height = height;
	}

	swap() {
		if (this._buffers.read === this._buffers.front) {
			this._buffers.read = this._buffers.back;
			this._buffers.write = this._buffers.front;
		} else {
			this._buffers.read = this._buffers.front;
			this._buffers.write = this._buffers.back;
		}

		return this;
	}

	update() {
		this._buffers.write.bind().updateViewport();

		this._program.bind();

		this._gl.clearColor(0, 0, 0, 1);
		this._gl.clear(this._gl.COLOR_BUFFER_BIT);

		this._gl.disable(BLEND);
		this._program.setUniformTexture(this._buffers.read.texture, 'uTexture');
		this._buffers.read.texture.activeTexture().bind();

		this._positionBuffer.bind().attribPointer(this._program);

		// render
		this._gl.drawArrays(TRIANGLES, 0, this._drawCnt);

		this._buffers.write.unbind();

		return this;
	}

	renderDebugView() {
		this._gl.viewport(
			this.debugSize.x,
			this.debugSize.y,
			this.debugSize.width,
			this.debugSize.height
		);
		this._debugProgram.bind();

		this._debugProgram.setUniformTexture(this._buffers.write.texture, 'uTexture');
		this._buffers.write.texture.activeTexture().bind();

		this._positionBuffer.bind().attribPointer(this._debugProgram);
		this._gl.disable(BLEND);
		this._gl.drawArrays(TRIANGLES, 0, this._drawCnt);

		return this;
	}

	resize(width, heigth) {
		this._width = width;
		this._height = heigth;
	}

	_makeProgram(params) {
		this._program = new Program(this._gl, vertexShader, params.fragmentShaderSrc);
		this._positionBuffer = new ArrayBuffer(this._gl, new Float32Array([0, 0, 1, 0, 0, 1]));
		this._positionBuffer.setAttribs('position', 2);
		this._drawCnt = 3;

		this._program.bind();
		this._uWindoRateLocation = this._program.getUniforms('uWindowRate').location;
		this._gl.uniform1f(this._uWindoRateLocation, this._height / this._width);
	}

	_makeDebugProgram() {
		this._debugProgram = new Program(this._gl, vertexShader, debugFragmentShader);

		this._debugProgram.bind();
		this._uDebugWindoRateLocation = this._debugProgram.getUniforms('uWindowRate').location;
		this._gl.uniform1f(this._uDebugWindoRateLocation, this._height / this._width);
	}

	_makeFramebuffer() {
		let frameBuffer0 = new FrameBuffer(
			this._gl,
			{
				type: FLOAT
			},
			this._width,
			this._height
		);
		frameBuffer0.unbind();

		let frameBuffer1 = new FrameBuffer(
			this._gl,
			{
				type: FLOAT
			},
			this._width,
			this._height
		);
		frameBuffer1.unbind();

		this._buffers = {
			read: frameBuffer0,
			write: frameBuffer1,
			front: frameBuffer0,
			back: frameBuffer1
		};
	}
}
