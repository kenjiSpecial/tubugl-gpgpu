import {
	Program,
	ArrayBuffer,
	FrameBuffer
} from 'tubugl-core';
import {
	vertexShader,
	debugFragmentShader
} from './shader';

const HALF_FLOAT = 0x8D61;
export class SwapRenderer {
	/**
	 *
	 *
	 * @param {webGlContext} gl
	 * @param {Object} params
	 * @param {String} params.fragmentShaderSrc
	 * @param {Boolean} params.isDebug
	 * @param {String} params.prgoramName
	 * @param {Boolean} params.isFloatTexture
	 * @param {Array} params.dataArray
	 * @param {Number} width
	 * @param {Number} height
	 */
	constructor(gl, params = {}, width = 128, height = 128) {
		this._gl = gl;
		this._width = width;
		this._height = height;
		this._isFloatTexture = params.isFloatTexture;

		this.debugSize = {
			x: 30,
			y: 30,
			width: 64,
			height: 64
		};
		this.isDebug = params.isDebug;
		this.programs = {};

		if (params.fragmentShaderSrc) this._makeProgram(params);
		this._makeFramebuffer(params);

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

	/**
	 *
	 * @param {Object} textures
	 * @param {Object} uniforms
	 */
	update(textures = {}, uniforms = {}, enablePrevTexture = true) {
		this._buffers.write.bind().updateViewport();

		this._program.bind();

		this._gl.clearColor(0, 0, 0, 1);
		this._gl.clear(this._gl.COLOR_BUFFER_BIT);

		this._gl.disable(this._gl.BLEND);

		if (enablePrevTexture)
			this._program.setUniformTexture(this._buffers.read.texture, 'uTexture');

		for (let key in textures) {
			let texture = textures[key];
			this._program.setUniformTexture(texture, key);
		}

		this._positionBuffer.bind().attribPointer(this._program);

		for (let key in uniforms) {
			let uniform = uniforms[key];
			switch (uniform.type) {
				case 'boolean':
				case 'float':
					this._gl.uniform1f(this._program.getUniforms(key).location, uniform.value);
					break;
				case 'vec2':
					this._gl.uniform2f(
						this._program.getUniforms(key).location,
						uniform.value[0],
						uniform.value[1]
					);
					break;
				case 'vec3':
					this._gl.uniform3f(
						this._program.getUniforms(key).location,
						uniform.value[0],
						uniform.value[1],
						uniform.value[2]
					);
					break;
				case 'vec4':
					this._gl.uniform4f(
						this._program.getUniforms(key).location,
						uniform.value[0],
						uniform.value[1],
						uniform.value[2],
						uniform.value[3]
					);
					break;
				case 'mat2':
					this._gl.uniformMatrix2fv(
						this._program.getUniforms(key).location,
						false,
						uniform.value
					);
					break;
				case 'mat3':
					this._gl.uniformMatrix3fv(
						this._program.getUniforms(key).location,
						false,
						uniform.value
					);
					break;
				case 'mat4':
					this._gl.uniformMatrix4fv(
						this._program.getUniforms(key).location,
						false,
						uniform.value
					);
					break;
			}
		}

		// render
		this._gl.drawArrays(this._gl.TRIANGLES, 0, this._drawCnt);

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

		this._positionBuffer.bind().attribPointer(this._debugProgram);
		this._gl.disable(this._gl.BLEND);
		this._gl.drawArrays(this._gl.TRIANGLES, 0, this._drawCnt);

		return this;
	}

	resize(width, heigth) {
		this._width = width;
		this._height = heigth;
	}

	/**
	 *
	 * @param {Object} params
	 * @param {String} params.fragmentShaderSrc
	 * @param {String} params.prgoramName
	 *
	 */
	_makeProgram(params) {
		this._program = new Program(this._gl, vertexShader, params.fragmentShaderSrc);
		let programName = params.programName ? params.programName : 'main';
		this.curProgramName = programName;
		this.programs[programName] = this._program;

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

	_makeFramebuffer(params) {
		let frameBuffer0 = new FrameBuffer(
			this._gl, {
				dataArray: params.dataArray,
				type: this._isFloatTexture ? this._gl.FLOAT : HALF_FLOAT
			},
			this._width,
			this._height
		);
		frameBuffer0.unbind();

		let frameBuffer1 = new FrameBuffer(
			this._gl, {
				dataArray: params.dataArray,
				type: this._isFloatTexture ? this._gl.FLOAT : HALF_FLOAT
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

	/**
	 * get texture
	 * 
	 * @param {String} type 
	 */
	updateTexture(type = 'read') {
		let frameBuffer;

		if (type == 'read') frameBuffer = this._buffers.read;
		else frameBuffer = this._buffers.write;

		let oldTexture = frameBuffer.updateTexture();

		return oldTexture;
	}

	/**
	 * Add Program 
	 *
	 * @param {String} shaderSrc fragment shader source file
	 * @param {String} programName programName
	 */
	addProgram(shaderSrc, programName) {
		this.programs[programName] = new Program(this._gl, vertexShader, shaderSrc);
		this.programs[programName].bind();
		this._uWindoRateLocation = this.programs[programName].getUniforms('uWindowRate').location;
		this._gl.uniform1f(this._uWindoRateLocation, this._height / this._width);
	}
	/**
	 *
	 * @param {String} programName name for programs
	 */
	updateProgram(programName) {
		if (!this.programs[programName]) {
			console.warn(`there is no '${programName}' program `);
			return;
		}

		this.curProgramName = programName;
		this._program = this.programs[programName];
		// console.log(this._program);
	}

	getWriteTexture() {
		return this._buffers.write.texture;
	}

	getReadTexture() {
		return this._buffers.read.texture;
	}

	getCurrentTexture() {
		return this.getWriteTexture();
	}
}