precision highp float;

attribute vec4 position;
attribute vec2 uv;
attribute vec2 id;
attribute float maxAlpha;
attribute vec3 duration;

uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform sampler2D uPositionTexture;
uniform float uTime;

varying vec2 vUv;
varying float vMaxAlpha;


vec2 rotate(vec2 v, float a) {
	float s = sin(a);
	float c = cos(a);
	mat2 m = mat2(c, -s, s, c);
	return m * v;
}

void main() {
    float totalTime = duration.y;
    float curTime = mod(uTime  + duration.z, totalTime);
    
    
    vec4 globalPosition = texture2D(uPositionTexture, id);
    float rot = globalPosition.a;
    vec4 viewPositon = viewMatrix *  (position  + vec4(globalPosition.rgb, 0.0));
    gl_Position = projectionMatrix * viewPositon;
    vUv = uv;
    vMaxAlpha = 1.0; //maxAlpha * mix( 0.3, 1.0, clamp(1.0 - ( -viewPositon.z -600.)/300., 0.0, 1.0)) * clamp(curTime, 0.0, 1.0) * clamp(1.0 - (curTime - duration.x), 0.0, 1.0);
}