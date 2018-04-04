'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var tubuglCore = require('tubugl-core');
var tubuglConstants = require('tubugl-constants');

var classCallCheck = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();

var vertexShader = '\nprecision mediump float;\n\nattribute vec4 position;\n\nuniform float uWindowRate;\n\nvarying vec2 vUv;\n\nvoid main() {\n\tfloat x = mix(-1., 1.0 + uWindowRate * 2.0, position.x);\n\tfloat y = mix(-1., 1.0 + 1.0/uWindowRate * 2.0, position.y);\n\tfloat uvX = mix(0., 1.0 + uWindowRate, position.x);\n\tfloat uvY = 1.0 - mix(0., 1.0 + 1.0/uWindowRate, position.y);\n\n\tgl_Position = vec4(x, y, position.z, 1.0);\n\tvUv = vec2(uvX, uvY);\n}';

var debugFragmentShader = '\nprecision mediump float;\n\nvarying vec2 vUv;\n\nuniform sampler2D uTexture;\n\nvoid main(){\n\tgl_FragColor = vec4(texture2D( uTexture, vUv).rgb, 1.0);\n}';

var SwapRenderer = function () {
	/**
  *
  * @param {webGlContext} gl
  * @param {{fragmentShaderSrc: string, isDebug: boolean}} params
  * @param {*} width
  * @param {*} height
  */
	function SwapRenderer(gl, params) {
		var width = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 128;
		var height = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 128;
		classCallCheck(this, SwapRenderer);

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
		this._isFloatTexture = params.isFloatTexture;

		this._makeProgram(params);
		this._makeFramebuffer(params);

		if (params.isDebug) this._makeDebugProgram();
	}

	createClass(SwapRenderer, [{
		key: 'setSize',
		value: function setSize(x, y, width, height) {
			if (x) this.debugSize.x = x;
			if (y) this.debugSize.y = y;
			if (width) this.debugSize.width = width;
			if (height) this.debugSize.height = height;
		}
	}, {
		key: 'swap',
		value: function swap() {
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
   * @param {*} textures
   */

	}, {
		key: 'update',
		value: function update() {
			var textures = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

			this._buffers.write.bind().updateViewport();

			this._program.bind();

			this._gl.clearColor(0, 0, 0, 1);
			this._gl.clear(this._gl.COLOR_BUFFER_BIT);

			this._gl.disable(tubuglConstants.BLEND);

			this._program.setUniformTexture(this._buffers.read.texture, 'uTexture');

			for (var key in textures) {
				var texture = textures[key];
				this._program.setUniformTexture(texture, key);
			}

			this._positionBuffer.bind().attribPointer(this._program);

			// render
			this._gl.drawArrays(tubuglConstants.TRIANGLES, 0, this._drawCnt);

			this._buffers.write.unbind();

			return this;
		}
	}, {
		key: 'renderDebugView',
		value: function renderDebugView() {
			this._gl.viewport(this.debugSize.x, this.debugSize.y, this.debugSize.width, this.debugSize.height);
			this._debugProgram.bind();

			this._debugProgram.setUniformTexture(this._buffers.write.texture, 'uTexture');
			this._buffers.write.texture.activeTexture().bind();

			this._positionBuffer.bind().attribPointer(this._debugProgram);
			this._gl.disable(tubuglConstants.BLEND);
			this._gl.drawArrays(tubuglConstants.TRIANGLES, 0, this._drawCnt);

			return this;
		}
	}, {
		key: 'resize',
		value: function resize(width, heigth) {
			this._width = width;
			this._height = heigth;
		}
	}, {
		key: '_makeProgram',
		value: function _makeProgram(params) {
			this._program = new tubuglCore.Program(this._gl, vertexShader, params.fragmentShaderSrc);
			this._positionBuffer = new tubuglCore.ArrayBuffer(this._gl, new Float32Array([0, 0, 1, 0, 0, 1]));
			this._positionBuffer.setAttribs('position', 2);
			this._drawCnt = 3;

			this._program.bind();
			this._uWindoRateLocation = this._program.getUniforms('uWindowRate').location;
			this._gl.uniform1f(this._uWindoRateLocation, this._height / this._width);
		}
	}, {
		key: '_makeDebugProgram',
		value: function _makeDebugProgram() {
			this._debugProgram = new tubuglCore.Program(this._gl, vertexShader, debugFragmentShader);

			this._debugProgram.bind();
			this._uDebugWindoRateLocation = this._debugProgram.getUniforms('uWindowRate').location;
			this._gl.uniform1f(this._uDebugWindoRateLocation, this._height / this._width);
		}
	}, {
		key: '_makeFramebuffer',
		value: function _makeFramebuffer(params) {
			var frameBuffer0 = new tubuglCore.FrameBuffer(this._gl, {
				dataArray: params.dataArray,
				type: tubuglConstants.FLOAT
			}, this._width, this._height);
			frameBuffer0.unbind();

			var frameBuffer1 = new tubuglCore.FrameBuffer(this._gl, {
				dataArray: params.dataArray,
				type: this._isFloatTexture ? tubuglConstants.FLOAT : tubuglConstants.HALF_FLOAT
			}, this._width, this._height);
			frameBuffer1.unbind();

			this._buffers = {
				read: frameBuffer0,
				write: frameBuffer1,
				front: frameBuffer0,
				back: frameBuffer1
			};
		}
	}, {
		key: 'getWriteTexture',
		value: function getWriteTexture() {
			return this._buffers.write.texture;
		}
	}, {
		key: 'getReadTexture',
		value: function getReadTexture() {
			return this._buffers.read.texture;
		}
	}, {
		key: 'getCurrentTexture',
		value: function getCurrentTexture() {
			return this.getWriteTexture();
		}
	}]);
	return SwapRenderer;
}();

// console.log('[tubugl-gpgpu] version: 1.1.0, %o', 'https://github.com/kenjiSpecial/tubugl-gpgpu');

exports.SwapRenderer = SwapRenderer;
