// const dat = require('dat.gui/build/dat.gui.min');
// const TweenLite = require('gsap/TweenLite');
const TweenLite = require('gsap/src/uncompressed/TweenLite');
import { Cube } from './components/customCube';
import { PerspectiveCamera, CameraController } from 'tubugl-camera';

export default class App {
	constructor(params = {}) {
		this._width = params.width ? params.width : window.innerWidth;
		this._height = params.height ? params.height : window.innerHeight;

		this.canvas = document.createElement('canvas');
		this.gl = this.canvas.getContext('webgl', {
			antialias: false,
			alpha: false
		});

		if (!this.gl.getExtension('OES_texture_float')) {
			let ext = this.gl.getExtension('OES_texture_half_float');
			this._isFloatTexture = false;
			if (!ext) throw new Error('This sddemo requires the OES_texture_float extension');
		} else {
			this._isFloatTexture = true;
		}

		this._setClear();
		this._makeBox();
		this._makeHelper();
		this._makeCamera();
		this._makeCameraController();

		if (params.isDebug) {
			// this.stats = new Stats();
			// document.body.appendChild(this.stats.dom);
			// this._addGui();
		} else {
			let descId = document.getElementById('tubugl-desc');
			descId.style.display = 'none';
		}

		// this._makeProgram();
		this.resize(this._width, this._height);
	}
	_setClear() {
		this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
		this.gl.enable(this.gl.DEPTH);
	}

	_makeBox() {
		let side = 20;
		this._box = new Cube(
			this.gl,
			{
				isWire: false,
				side: 'front',
				isFloatTexture: this._isFloatTexture
			},
			side,
			side,
			side,
			1,
			1,
			1
		);
		// this._box.position.y = side * 1.5;
	}

	_makeHelper() {
		// this._normalHelper = new NormalHelper(this.gl, this._box);
		// this._gridHelper = new GridHelper(this.gl, 1000, 1000, 20, 20);
	}

	_makeCamera() {
		this._camera = new PerspectiveCamera(window.innerWidth, window.innerHeight, 60, 1, 2000);
		this._camera.position.z = 600;
		this._camera.position.x = -600;
		this._camera.position.y = 200;
		this._camera.lookAt([0, 0, 0]);
	}

	_makeCameraController() {
		this._cameraController = new CameraController(this._camera, this.canvas);
		this._cameraController.minDistance = 300;
		this._cameraController.maxDistance = 1500;
	}

	_addGui() {
		// this.gui = new dat.GUI();
		// this.playAndStopGui = this.gui.add(this, '_playAndStop').name('pause');
		// this._boxGUIFolder = this.gui.addFolder('rounding  cube');
		// this._box.addGui(this._boxGUIFolder);
		// this._boxGUIFolder.open();
	}

	animateIn() {
		this.isLoop = true;
		TweenLite.ticker.addEventListener('tick', this.loop, this);
	}

	loop() {
		if (this.stats) this.stats.update();

		let gl = this.gl;
		gl.viewport(0, 0, this._width, this._height);
		gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

		this._camera.update();
		this._box.render(this._camera);
	}

	animateOut() {
		TweenLite.ticker.removeEventListener('tick', this.loop, this);
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
			TweenLite.ticker.addEventListener('tick', this.loop, this);
			// this.playAndStopGui.name('pause');
		} else {
			TweenLite.ticker.removeEventListener('tick', this.loop, this);
			// this.playAndStopGui.name('play');
		}
	}

	resize(width, height) {
		this._width = width;
		this._height = height;

		this.canvas.width = this._width;
		this.canvas.height = this._height;
		this.gl.viewport(0, 0, this._width, this._height);

		this._box.resize(this._width, this._height);
		this._camera.updateSize(this._width, this._height);
	}

	destroy() {}
}
