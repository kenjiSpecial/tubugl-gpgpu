precision mediump float;

varying vec2 vUv;
varying float vMaxAlpha;

void main(){
    float alpha = 1.0 - clamp(distance(vUv, vec2(0.5))/0.5, 0.0, 1.0);
    if(alpha < 0.1) discard;
    gl_FragColor = vec4(1.0);
    gl_FragColor.a = alpha * vMaxAlpha; 
}