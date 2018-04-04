import { Program, ArrayBuffer, IndexArrayBuffer } from 'tubugl-core';
import { SRC_ALPHA, ONE_MINUS_SRC_ALPHA, CULL_FACE } from 'tubugl-constants';
import { mathUtils } from 'tubugl-utils';
import { SwapRenderer } from '../../src/swapRenderer';

const initPositionFragmentSrc = require('./shaders/particle/initPosition/shader.frag.glsl');
const positionFragmentSrc = require('./shaders/particle/position/shader.frag.glsl');

const velocityFragmentSrc = require('./shaders/particle/velocity/shader.frag.glsl');

const vertexShaderSrc = require('./shaders/particle/shader.vert.glsl');
const fragmentShaderSrc = require('./shaders/particle/shader.frag.glsl');

const size = 64;

export class Particle {
	constructor(gl, params = {}) {
		this._gl = gl;

		this._time = 0;
		this._isDebug = true;
		this._width = params.width;
		this._height = params.height;
		this._isFirst = true;

		this._makeProgram();
		this._makeBuffer();
		this._makeSwapRenderer();

		// this.initUpdate();
	}
	_makeProgram() {
		this._program = new Program(this._gl, vertexShaderSrc, fragmentShaderSrc);
	}
	_makeBuffer() {
		let vertices = [];
		let uvs = [];
		let indices = [];
		let ids = [];
		let maxAlphaArr = [];
		let durationArr = [];

		// let modelDataSize = this.modelData.vertexPositions.length;

		// for (let ii = 0; ii < modelDataSize; ii++) {
		// let size = 256;
		let modelDataSize = size * size;
		for (let ii = 0; ii < modelDataSize; ii++) {
			let particleSize = mathUtils.randomFloat(5, 15);
			let scaleH = 1.0;

			let startX = -particleSize / 2 * scaleH;
			let endX = startX + particleSize * scaleH;

			let startY = particleSize / 2;
			let endY = startY - particleSize;

			let startUVX = 0;
			let endUVX = 1.0;
			let startUVY = 0;
			let endUVY = 1.0;

			let maxAlp = mathUtils.mix(0.1, 0.25, 1.0 - (particleSize - 5) / 10);

			// let globalPosition = this._getPosition(); //this.modelData.vertexPositions[ii];

			vertices.push(startX, startY, endX, startY, endX, endY, startX, endY);
			uvs.push(startUVX, startUVY, endUVX, startUVY, endUVX, endUVY, startUVX, endUVY);
			maxAlphaArr.push(maxAlp, maxAlp, maxAlp, maxAlp);

			let idX = parseInt(ii / size) / size;
			let idY = (ii % size) / size;

			ids.push(idX, idY, idX, idY, idX, idY, idX, idY);
			let lastIndex = 4 * ii;
			indices.push(
				0 + lastIndex,
				2 + lastIndex,
				1 + lastIndex,
				0 + lastIndex,
				3 + lastIndex,
				2 + lastIndex
			);

			let duration = mathUtils.randomFloat(3, 6);
			let totalTime = duration + mathUtils.randomFloat(3, 4);
			let initTime = totalTime * Math.random();

			durationArr.push(
				duration,
				totalTime,
				initTime,
				duration,
				totalTime,
				initTime,
				duration,
				totalTime,
				initTime,
				duration,
				totalTime,
				initTime
			);
		}

		if (!this._positionBuffer) {
			this._positionBuffer = new ArrayBuffer(this._gl, new Float32Array(vertices));
			this._positionBuffer.setAttribs('position', 2);
		} else
			this._positionBuffer
				.bind()
				.update(new Float32Array(vertices))
				.unbind();

		if (!this._uvBuffer) {
			this._uvBuffer = new ArrayBuffer(this._gl, new Float32Array(uvs));
			this._uvBuffer.setAttribs('uv', 2);
		} else
			this._uvBuffer
				.bind()
				.update(new Float32Array(vertices))
				.unbind();

		if (!this._idBuffer) {
			this._idBuffer = new ArrayBuffer(this._gl, new Float32Array(ids));
			this._idBuffer.setAttribs('id', 2);
		} else
			this._idBuffer
				.bind()
				.update(new Float32Array(ids))
				.unbind();

		this._alphaBuffer = new ArrayBuffer(this._gl, new Float32Array(maxAlphaArr));
		this._alphaBuffer.setAttribs('maxAlpha', 1);

		this._durationBuffer = new ArrayBuffer(this._gl, new Float32Array(durationArr));
		this._durationBuffer.setAttribs('duration', 3);

		if (!this._indexBuffer)
			this._indexBuffer = new IndexArrayBuffer(this._gl, new Uint32Array(indices));
		else this._indexBuffer.setData(new Uint32Array(indices)).unbind();

		this._cnt = indices.length;
	}
	_makeSwapRenderer() {
		if (!this._gl.getExtension('OES_texture_float')) {
			let ext = this._gl.getExtension('OES_texture_half_float');
			this._isFloatTexture = false;
			if (!ext) throw new Error('This sddemo requires the OES_texture_float extension');
		} else {
			this._isFloatTexture = true;
		}

		this._velocityRenderer = new SwapRenderer(
			this._gl,
			{
				fragmentShaderSrc: velocityFragmentSrc,
				isDebug: this._isDebug,
				isFloatTexture: this._isFloatTexture
			},
			size,
			size
		);

		let dataArray = [];
		for (let ii = 0; ii < size * size; ii++) {
			let uvX = (ii % size) / size + 1 / size;
			let uvY = parseInt(ii / size) / size + 1 / size;

			const pos = this._getPosition({ x: uvX, y: uvY });
			dataArray[4 * ii + 0] = pos[0];
			dataArray[4 * ii + 1] = pos[1];
			dataArray[4 * ii + 2] = pos[2];
			dataArray[4 * ii + 3] = 1;
		}
		dataArray = new Float32Array(dataArray);

		this._positionRenderer = new SwapRenderer(
			this._gl,
			{
				fragmentShaderSrc: initPositionFragmentSrc,
				isDebug: this._isDebug,
				isFloatTexture: this._isFloatTexture,
				dataArray: dataArray,
				prgoramName: 'init'
			},
			size,
			size
		);
		this._positionRenderer.addProgram(positionFragmentSrc, 'normal');

		this._velocityRenderer.setSize(this._width - 128 - 30, 20, 128, 128);
		this._positionRenderer.setSize(this._width - 128 * 2 - 40, 20, 128, 128);
	}
	_getPosition() {
		let xPos = mathUtils.randomFloat(-1000, 1000);

		return [xPos, 0, 0];
	}
	_updateAttributes() {
		this._indexBuffer.bind();
		this._positionBuffer.bind().attribPointer(this._program);
		this._idBuffer.bind().attribPointer(this._program);
		this._uvBuffer.bind().attribPointer(this._program);
		this._alphaBuffer.bind().attribPointer(this._program);
		this._durationBuffer.bind().attribPointer(this._program);
	}
	render(camera, time) {
		this.update(camera, time).draw();
	}
	draw() {
		// if (this._side === 'double') {
		this._gl.disable(CULL_FACE);
		// } else if (this._side === 'front') {
		// 	this._gl.enable(CULL_FACE);
		// 	this._gl.cullFace(BACK);
		// } else {
		// 	this._gl.enable(CULL_FACE);
		// 	this._gl.cullFace(FRONT);
		// }

		this._gl.enable(this._gl.BLEND);
		this._gl.blendFunc(SRC_ALPHA, ONE_MINUS_SRC_ALPHA);
		this._gl.viewport(0, 0, this._width, this._height);
		// console.log(this._cnt);
		this._gl.drawElements(this._gl.TRIANGLES, this._cnt, this._gl.UNSIGNED_INT, 0);

		// if (this._isDebug) {
			this._velocityRenderer.renderDebugView();
			this._positionRenderer.renderDebugView();
		// }
        if (this._isFirst) {
			this._isFirst = false;
			this._positionRenderer.updateProgram('normal');
		}
		return this;
	}
	update(camera, time) {
		this._velocityRenderer.update(
			{
				positionTexture: this._positionRenderer.getCurrentTexture()
			}
			// { uTime: { type: 'float', value: time } }
		);

		this._positionRenderer.update({
			velocityTexture: this._velocityRenderer.getCurrentTexture()
		});
		// this._isFirst = false;

		// console.log(this.__width, this._height);

		this._program.bind();

		this._updateAttributes();

		this._gl.uniformMatrix4fv(
			this._program.getUniforms('viewMatrix').location,
			false,
			camera.viewMatrix
		);
		this._gl.uniformMatrix4fv(
			this._program.getUniforms('projectionMatrix').location,
			false,
			camera.projectionMatrix
		);
		this._gl.uniform1f(this._program.getUniforms('uTime').location, time);

		let texture = this._positionRenderer.getCurrentTexture();
		this._program.setUniformTexture(texture, 'uPositionTexture');
		// texture.activeTexture().bind();

		// if (this._program.getUniforms('modelMatrix'))
		// 	this._gl.uniformMatrix4fv(
		// 		this._program.getUniforms('modelMatrix').location,
		// 		false,
		// 		this.modelMatrix
		// 	);

		// let smoothingUniform = this._program.getUniforms('uSmoothing');
		// let sdfTexelUniform = this._program.getUniforms('uSdfTexel');
		// let hintUniform = this._program.getUniforms('uHintAmount');
		// let subpixelUniform = this._program.getUniforms('uSubpixelAmount');
		// let uFontColor = this._program.getUniforms('uFontColor');
		// let bgColor = this._program.getUniforms('uBgColor');

		// if (smoothingUniform) this._gl.uniform1f(smoothingUniform.location, this.smoothing);
		// if (sdfTexelUniform) this._gl.uniform1f(sdfTexelUniform.location, this.sdfTexel);
		// if (hintUniform) this._gl.uniform1f(hintUniform.location, this.hintAmount);
		// if (subpixelUniform) this._gl.uniform1f(subpixelUniform.location, this.subpixelAmount);

		// if (bgColor)
		// 	this._gl.uniform3f(bgColor.location, this.bgColor[0], this.bgColor[1], this.bgColor[2]);
		// if (uFontColor)
		// 	this._gl.uniform3f(
		// 		uFontColor.location,
		// 		this.fontColor[0],
		// 		this.fontColor[1],
		// 		this.fontColor[2]
		// 	);

		this._velocityRenderer.swap();
		this._positionRenderer.swap();

		

		return this;
	}
	resize(width, height) {
		this._width = width;
		this._height = height;
	}
}
