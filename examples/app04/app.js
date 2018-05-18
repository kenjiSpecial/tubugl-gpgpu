const TweenMax = require('gsap');
import { Particle } from './particle';
import { PerspectiveCamera, CameraController } from 'tubugl-camera';
const UIL = require('uil');

export default class App {
	constructor(params = {}) {
		this._width = params.width ? params.width : window.innerWidth;
		this._height = params.height ? params.height : window.innerHeight;

		this.canvas = document.createElement('canvas');
		this.gl = this.canvas.getContext('webgl', {
			antialias: false,
			alpha: false
		});

		this.gl.getExtension('OES_element_index_uint');

		if (!this.gl.getExtension('OES_texture_float')) {
			let ext = this.gl.getExtension('OES_texture_half_float');
			this._isFloatTexture = false;
			if (!ext) throw new Error('This sddemo requires the OES_texture_float extension');
		} else {
			this._isFloatTexture = true;
		}

		this._makeParticle();
		this._makeHelper();
		this._makeCamera();
		this._makeCameraController();

		if (params.isDebug) {
			this._addGui();
		} else {
			let descId = document.getElementById('tubugl-desc');
			descId.style.display = 'none';
		}

		// this._makeProgram();
		this.resize(this._width, this._height);
	}

	_makeParticle() {
		this._particle = new Particle(this.gl, {
			width: this._width,
			height: this._height,
			isDebug: this._isDebug
		});
	}

	_makeHelper() {
		// this._normalHelper = new NormalHelper(this.gl, this._box);
		// this._gridHelper = new GridHelper(this.gl, 1000, 1000, 20, 20);
	}

	_makeCamera() {
		this._camera = new PerspectiveCamera(window.innerWidth, window.innerHeight, 60, 1, 2000);
		this._camera.position.z = 800;
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
		const ui = new UIL.Gui({
			w: 300
		}).onChange(this._callback);
		ui.add('title', {
			name: 'GUI'
		});
		ui.add('fps', {
			res: 40
		});

		let button = ui
			.add('button', {
				name: 'update frameBuffer',
				callback: () => {
					this._updateFramebuffer();
				}
			})
			.listen();
	}

	_updateFramebuffer() {
		// console.log('_updateFramebuffer')j;
		// let prevTexture = this..updateTexture();
		this._particle.updateTexture();
	}

	animateIn() {
		this.isLoop = true;
		TweenLite.ticker.addEventListener('tick', this.loop, this);
	}

	loop() {
		if (this.stats) this.stats.update();

		let gl = this.gl;
		gl.viewport(0, 0, this._width, this._height);
		gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

		this._camera.update();
		this._particle.render(this._camera);
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

		this._particle.resize(this._width, this._height);
		this._camera.updateSize(this._width, this._height);
	}

	destroy() {}
}
