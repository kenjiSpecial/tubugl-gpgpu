export const vertexShader = `
precision mediump float;

attribute vec4 position;

uniform float uWindowRate;

varying vec2 vUv;

void main() {
	float x = mix(-1., 1.0 + uWindowRate * 2.0, position.x);
	float y = mix(-1., 1.0 + 1.0/uWindowRate * 2.0, position.y);
    // float uvX = mix(0., 1.0 + uWindowRate, position.x);
    float uvX = position.x + uWindowRate * position.x;
    // float uvY = 1.0 - mix(0., 1.0 + 1.0/uWindowRate, position.y);
    // float uvY = 1.0 - (1.0 + 1.0/uWindowRate) * position.y;
    float uvY = 1.0 - position.y - position.y/uWindowRate;

	gl_Position = vec4(x, y, position.z, 1.0);
	vUv = vec2(uvX, uvY);
}`;

export const debugFragmentShader = `
precision mediump float;

varying vec2 vUv;

uniform sampler2D uTexture;

void main(){
	gl_FragColor = vec4(texture2D( uTexture, vUv).rgb, 1.0);
}`;
