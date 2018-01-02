import {
	baseUVShaderVertSrc,
	baseUVShaderFragSrc,
	base2ShaderVertSrc,
	base2ShaderFragSrc,
	wireFrameFragSrc,
	baseShaderVertSrc
} from './shaders/base.shader';
import { Program, ArrayBuffer, IndexArrayBuffer, VAO } from 'tubugl-core';
import {
	CULL_FACE,
	FRONT,
	BACK,
	TRIANGLES,
	UNSIGNED_SHORT,
	DEPTH_TEST,
	SRC_ALPHA,
	ZERO,
	BLEND,
	LINES,
	ONE_MINUS_SRC_ALPHA
} from 'tubugl-constants';
import { generateWireframeIndices } from 'tubugl-utils';
import { Object3D } from 'tubugl-3d-shape/src/object3D';
import { SwapRenderer } from '../../../src/swapRenderer';

export const cubeCollectionShaderVertSrc = `
attribute vec4 position;
attribute vec3 normal;
attribute vec2 uv;
attribute vec2 id;

uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform mat4 modelMatrix;
uniform sampler2D positionTexture;

varying vec3 vNormal;
varying vec2 vUv;

void main() {
	vec3 texCol = texture2D(positionTexture, id).rgb;
	float dis = distance(id, vec2(0.5));
	float theta = atan(id.y - 0.5, id.x - 0.5);
	float posY = 1.5 * (cos(texCol.g - dis * 30.) + 1.0) * (cos(theta + texCol.b) + 0.5);
	float scale = (sin(texCol.r + dis * 20. ) ) * 30.;
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * (vec4(position.x, position.y * posY + scale, position.z, position.w)  );
    vNormal = normal;
    vUv = uv;
}`;

const positionFragmentSrc = `
precision mediump float;

uniform sampler2D uTexture;

varying vec2 vUv;

void main(){
	vec2 customUv = vec2(vUv.x, 1.0 - vUv.y);
	vec4 textureColor = texture2D( uTexture, customUv );
	textureColor.y =  textureColor.y + 0.07;
	textureColor.x = textureColor.x + 0.04; 
	textureColor.z = textureColor.z + 0.02; 
	gl_FragColor = textureColor;
}`;

export class Cube extends Object3D {
	/**
	 *
	 * @param {*} gl
	 * @param {*} params
	 * @param {*} width
	 * @param {*} height
	 * @param {*} depth
	 * @param {*} widthSegment
	 * @param {*} heightSegment
	 * @param {*} depthSegment
	 */
	constructor(
		gl,
		params = { isDepthTest: true },
		width = 100,
		height = 100,
		depth = 100,
		widthSegment = 1,
		heightSegment = 1,
		depthSegment = 1
	) {
		super(gl, params);

		this._width = width;
		this._height = height;
		this._depth = depth;
		this._widthSegment = widthSegment;
		this._heightSegment = heightSegment;
		this._depthSegment = depthSegment;
		this._boxNum = 32 * 32;
		this._isFloatTexture = params.isFloatTexture;

		this._makeProgram(params);
		this._makeBuffer(params);
		this._makeSwaprender();

		if (this._isWire) {
			this._makeWireframe();
			this._makeWireframeBuffer();
		}
	}

	getVertice() {
		return this._positionBuffer.dataArray;
	}
	getNormals() {
		return this._normalBuffer.dataArray;
	}
	_makeProgram(params) {
		const fragmentShaderSrc = params.fragmentShaderSrc
			? params.fragmentShaderSrc
			: this._isGl2 ? base2ShaderFragSrc : baseUVShaderFragSrc;
		const vertexShaderSrc = params.vertexShaderSrc
			? params.vertexShaderSrc
			: this._isGl2 ? base2ShaderVertSrc : cubeCollectionShaderVertSrc;

		this._program = new Program(this._gl, vertexShaderSrc, fragmentShaderSrc);
	}

	_makeWireframe() {
		this._wireframeProgram = new Program(
			this._gl,
			cubeCollectionShaderVertSrc,
			wireFrameFragSrc
		);
	}

	_makeBuffer() {
		if (this._isGl2) {
			this._vao = new VAO(this._gl);
			this._vao.bind();
		}

		let cubeObj = Cube.getVertice(
			this._width,
			this._height,
			this._depth,
			this._widthSegment,
			this._heightSegment,
			this._depthSegment
		);

		let normals = Cube.getNormal(this._widthSegment, this._heightSegment, this._depthSegment);
		let indices = Cube.getIndices(this._widthSegment, this._heightSegment, this._depthSegment);

		let dX = 32;
		let dZ = 32;

		let verticeArray = [],
			normalArray = [],
			indicesArray = [],
			uvArray = [],
			idArray = [];
		let sideNum = Math.sqrt(this._boxNum);
		for (let zz = 0; zz < sideNum; zz++) {
			let zPos = (zz - sideNum / 2) * dZ;

			for (let xx = 0; xx < sideNum; xx++) {
				let xPos = (xx - sideNum / 2) * dX;
				for (var ii = 0; ii < cubeObj.vertices.length / 3; ii++) {
					verticeArray.push(
						cubeObj.vertices[3 * ii] + xPos,
						cubeObj.vertices[3 * ii + 1] + this._height / 2,
						cubeObj.vertices[3 * ii + 2] + zPos
					);

					uvArray.push(cubeObj.uvs[2 * ii], cubeObj.uvs[2 * ii + 1]);
					idArray.push(xx / sideNum, zz / sideNum);
				}

				let dNum = cubeObj.vertices.length / 3 * (xx + zz * sideNum);
				indices.forEach(index => {
					indicesArray.push(index + dNum);
				});

				normals.forEach(normal => {
					normalArray.push(normal);
				});
			}
		}

		this._positionBuffer = new ArrayBuffer(this._gl, new Float32Array(verticeArray));
		this._positionBuffer.setAttribs('position', 3);

		this._uvBuffer = new ArrayBuffer(this._gl, new Float32Array(uvArray));
		this._uvBuffer.setAttribs('uv', 2);

		this._normalBuffer = new ArrayBuffer(this._gl, new Float32Array(normalArray));
		this._normalBuffer.setAttribs('normal', 3);

		this._idBuffer = new ArrayBuffer(this._gl, new Float32Array(idArray));
		this._idBuffer.setAttribs('id', 2);

		if (this._vao) {
			this._positionBuffer.bind().attribPointer(this._program);
			this._uvBuffer.bind().attribPointer(this._program);
			this._normalBuffer.bind().attribPointer(this._program);
			this._idBuffer.bind().attribPointer(this._program);
		}
		this._indexBuffer = new IndexArrayBuffer(this._gl, new Uint16Array(indicesArray));

		this._cnt = indicesArray.length;
	}

	_makeSwaprender() {
		let dataArray = [];
		for (let ii = 0; ii < 32 * 32; ii++) {
			dataArray[4 * ii + 0] = 2 * Math.random() - 1;
			dataArray[4 * ii + 1] = -2 * Math.random();
			dataArray[4 * ii + 2] = 0;
			dataArray[4 * ii + 3] = 1;
		}

		dataArray = new Float32Array(dataArray);

		this._swapRenderer = new SwapRenderer(
			this._gl,
			{
				isFloatTexture: this._isFloatTexture,
				fragmentShaderSrc: positionFragmentSrc,
				isDebug: true
			},
			32,
			32
		);
		this._swapRenderer.setSize(window.innerWidth - 128 - 30, 20, 128, 128);
	}

	_makeWireframeBuffer() {
		this._wireframeIndexBuffer = new IndexArrayBuffer(
			this._gl,
			generateWireframeIndices(this._indexBuffer.dataArray)
		);
		this._wireframeIndexCnt = this._wireframeIndexBuffer.dataArray.length;
	}

	_updateAttributres() {
		if (this._vao) {
			this._vao.bind();
		} else {
			this._positionBuffer.bind().attribPointer(this._program);
			this._uvBuffer.bind().attribPointer(this._program);
			this._normalBuffer.bind().attribPointer(this._program);
			this._idBuffer.bind().attribPointer(this._program);
			this._indexBuffer.bind();
		}
	}

	render(camera) {
		this._swapRenderer.update();

		this._gl.viewport(0, 0, window.innerWidth, window.innerHeight);
		// gl.clear(COLOR_BUFFER_BIT | DEPTH_BUFFER_BIT);
		this.update(camera).draw();

		if (this._isWire) this.updateWire(camera).drawWireframe();
		this._swapRenderer.swap();
	}

	debugRender() {
		this._swapRenderer.renderDebugView();
	}

	update(camera) {
		this._updateModelMatrix();

		this._program.bind();

		this._updateAttributres();

		let texture = this._swapRenderer.getCurrentTexture();
		this._program.setUniformTexture(texture, 'positionTexture');
		texture.activeTexture().bind();

		this._gl.uniformMatrix4fv(
			this._program.getUniforms('modelMatrix').location,
			false,
			this.modelMatrix
		);
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

		return this;
	}

	updateWire(camera) {
		let prg = this._wireframeProgram;

		prg.bind();
		this._positionBuffer.bind().attribPointer(prg);
		this._wireframeIndexBuffer.bind();

		this._gl.uniformMatrix4fv(prg.getUniforms('modelMatrix').location, false, this.modelMatrix);
		this._gl.uniformMatrix4fv(prg.getUniforms('viewMatrix').location, false, camera.viewMatrix);
		this._gl.uniformMatrix4fv(
			prg.getUniforms('projectionMatrix').location,
			false,
			camera.projectionMatrix
		);

		return this;
	}

	draw() {
		if (this._side === 'double') {
			this._gl.disable(CULL_FACE);
		} else if (this._side === 'front') {
			this._gl.enable(CULL_FACE);
			this._gl.cullFace(BACK);
		} else {
			this._gl.enable(CULL_FACE);
			this._gl.cullFace(FRONT);
		}

		if (this._isDepthTest) this._gl.enable(DEPTH_TEST);
		else this._gl.disable(DEPTH_TEST);

		if (this._isTransparent) {
			this.gl.blendFunc(SRC_ALPHA, ONE_MINUS_SRC_ALPHA);
			this._gl.enable(BLEND);
		} else {
			this._gl.blendFunc(SRC_ALPHA, ZERO);
			this._gl.disable(BLEND);
		}

		this._gl.drawElements(TRIANGLES, this._cnt, UNSIGNED_SHORT, 0);

		return this;
	}

	drawWireframe() {
		this._gl.drawElements(LINES, this._wireframeIndexCnt, UNSIGNED_SHORT, 0);

		return;
	}

	resize() {}

	addGui(gui) {
		let positionFolder = gui.addFolder('position');
		positionFolder.add(this.position, 'x', -200, 200);
		positionFolder.add(this.position, 'y', -200, 200);
		positionFolder.add(this.position, 'z', -200, 200);

		let scaleFolder = gui.addFolder('scale');
		scaleFolder.add(this.scale, 'x', 0.05, 2).step(0.01);
		scaleFolder.add(this.scale, 'y', 0.05, 2).step(0.01);
		scaleFolder.add(this.scale, 'z', 0.05, 2).step(0.01);

		let rotationFolder = gui.addFolder('rotation');
		rotationFolder.add(this.rotation, 'x', -Math.PI, Math.PI).step(0.01);
		rotationFolder.add(this.rotation, 'y', -Math.PI, Math.PI).step(0.01);
		rotationFolder.add(this.rotation, 'z', -Math.PI, Math.PI).step(0.01);

		gui
			.add(this, '_isWire')
			.name('isWire')
			.onChange(() => {
				if (this._isWire && !this._wireframeProgram) {
					this._makeWireframe();
					this._makeWireframeBuffer();
				}
			});
	}

	static getVertice(width, height, depth, widthSegment, heightSegment, depthSegment) {
		let vertices = [];
		let uvs = [];
		let xRate = 1 / widthSegment;
		let yRate = 1 / heightSegment;
		let zRate = 1 / depthSegment;

		for (let ii = 0; ii < 2; ii++) {
			let dir = ii === 0 ? -1 : 1;
			for (let zz = 0; zz <= depthSegment; zz++) {
				let zPos = (-0.5 + zRate * zz) * depth;

				for (let xx = 0; xx <= widthSegment; xx++) {
					let xPos = (-0.5 + xRate * xx) * width;

					vertices.push(xPos);
					vertices.push(dir * height / 2);
					vertices.push(zPos);

					uvs.push(xx * xRate);

					if (ii == 1) uvs.push(zz * zRate);
					else uvs.push(1.0 - zz * zRate);
				}
			}
		}

		for (let ii = 0; ii < 2; ii++) {
			let dir = ii === 0 ? -1 : 1;
			for (let yy = 0; yy <= heightSegment; yy++) {
				let yPos = (-0.5 + yRate * yy) * height;

				for (let xx = 0; xx <= widthSegment; xx++) {
					let xPos = (-0.5 + xRate * xx) * width;

					vertices.push(xPos);
					vertices.push(yPos);
					vertices.push(dir * depth / 2);

					if (ii == 1) uvs.push(xx * xRate);
					else uvs.push(1.0 - xx * xRate);

					uvs.push(1.0 - yy * yRate);
				}
			}
		}

		for (let ii = 0; ii < 2; ii++) {
			let dir = ii === 0 ? -1 : 1;
			for (let yy = 0; yy <= heightSegment; yy++) {
				let yPos = (-0.5 + yRate * yy) * height;
				for (let zz = 0; zz <= depthSegment; zz++) {
					let zPos = (-0.5 + zRate * zz) * depth;

					vertices.push(dir * width / 2);
					vertices.push(yPos);
					vertices.push(zPos);

					if (ii === 0) uvs.push(zz * zRate);
					else uvs.push(1.0 - zz * zRate);
					uvs.push(1.0 - yy * yRate);
				}
			}
		}

		return { vertices: vertices, uvs: uvs };
	}

	static getIndices(widthSegment, heightSegment, depthSegment) {
		let indices = [];

		let num = 0;
		for (let ii = 0; ii < 2; ii++) {
			for (let yy = 0; yy < depthSegment; yy++) {
				for (let xx = 0; xx < widthSegment; xx++) {
					let rowStartNum = yy * (widthSegment + 1);
					let nextRowStartNum = (yy + 1) * (widthSegment + 1);

					if (ii == 0) {
						indices.push(rowStartNum + xx + num);
						indices.push(rowStartNum + xx + 1 + num);
						indices.push(nextRowStartNum + xx + 1 + num);

						indices.push(rowStartNum + xx + num);
						indices.push(nextRowStartNum + xx + 1 + num);
						indices.push(nextRowStartNum + xx + num);
					} else {
						indices.push(rowStartNum + xx + num);
						indices.push(nextRowStartNum + xx + num);
						indices.push(rowStartNum + xx + 1 + num);

						indices.push(rowStartNum + xx + 1 + num);
						indices.push(nextRowStartNum + xx + num);
						indices.push(nextRowStartNum + xx + 1 + num);
					}
				}
			}

			num += (widthSegment + 1) * (depthSegment + 1);
		}

		for (let ii = 0; ii < 2; ii++) {
			for (let yy = 0; yy < heightSegment; yy++) {
				for (let xx = 0; xx < widthSegment; xx++) {
					let rowStartNum = yy * (widthSegment + 1);
					let nextRowStartNum = (yy + 1) * (widthSegment + 1);

					if (ii == 0) {
						indices.push(rowStartNum + xx + num);
						indices.push(nextRowStartNum + xx + num);
						indices.push(rowStartNum + xx + 1 + num);

						indices.push(rowStartNum + xx + 1 + num);
						indices.push(nextRowStartNum + xx + num);
						indices.push(nextRowStartNum + xx + 1 + num);
					} else {
						indices.push(rowStartNum + xx + num);
						indices.push(rowStartNum + xx + 1 + num);
						indices.push(nextRowStartNum + xx + num + 1);

						indices.push(rowStartNum + xx + num);
						indices.push(nextRowStartNum + xx + 1 + num);
						indices.push(nextRowStartNum + xx + num);
					}
				}
			}

			num += (widthSegment + 1) * (heightSegment + 1);
		}

		for (let ii = 0; ii < 2; ii++) {
			for (let yy = 0; yy < heightSegment; yy++) {
				for (let zz = 0; zz < depthSegment; zz++) {
					let rowStartNum = yy * (depthSegment + 1);
					let nextRowStartNum = (yy + 1) * (depthSegment + 1);

					if (ii == 0) {
						indices.push(rowStartNum + zz + num);
						indices.push(rowStartNum + zz + 1 + num);
						indices.push(nextRowStartNum + zz + 1 + num);

						indices.push(rowStartNum + zz + num);
						indices.push(nextRowStartNum + zz + 1 + num);
						indices.push(nextRowStartNum + zz + num);
					} else {
						indices.push(rowStartNum + zz + num);
						indices.push(nextRowStartNum + zz + num);
						indices.push(rowStartNum + zz + 1 + num);

						indices.push(rowStartNum + zz + 1 + num);
						indices.push(nextRowStartNum + zz + num);
						indices.push(nextRowStartNum + zz + num + 1);
					}
				}
			}

			num += (depthSegment + 1) * (heightSegment + 1);
		}

		return indices;
	}
	static getNormal(widthSegment, heightSegment, depthSegment) {
		let normals = [];

		for (let ii = 0; ii < 2; ii++) {
			let dir = ii == 0 ? -1 : 1;
			for (let yy = 0; yy <= depthSegment; yy++) {
				for (let xx = 0; xx <= widthSegment; xx++) {
					normals.push(0);
					normals.push(dir);
					normals.push(0);
				}
			}
		}

		for (let ii = 0; ii < 2; ii++) {
			let dir = ii == 0 ? -1 : 1;
			for (let yy = 0; yy <= heightSegment; yy++) {
				for (let xx = 0; xx <= widthSegment; xx++) {
					normals.push(0);
					normals.push(0);
					normals.push(dir);
				}
			}
		}

		for (let ii = 0; ii < 2; ii++) {
			let dir = ii == 0 ? -1 : 1;
			for (let yy = 0; yy <= heightSegment; yy++) {
				for (let xx = 0; xx <= depthSegment; xx++) {
					normals.push(dir);
					normals.push(0);
					normals.push(0);
				}
			}
		}

		return normals;
	}
}
