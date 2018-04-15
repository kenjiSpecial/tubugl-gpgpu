precision highp float;

uniform sampler2D velocityTexture;
uniform sampler2D uTexture;
varying vec2 vUv;

void main(){
    
	vec2 customUv = vec2(vUv.x, 1.0 - vUv.y);
    vec4 velocity = texture2D( velocityTexture, customUv );
	vec4 position = texture2D( uTexture, customUv );
    
    
    position.rgb = position.rgb + velocity.rgb;

    if(position.x > 1000.) {
        position.x = -1000.;//position.x - 3140.;
        position.y = 0.;
        position.z = 0.;
    }

	gl_FragColor = position;
}
