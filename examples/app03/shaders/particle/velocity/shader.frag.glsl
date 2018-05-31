precision highp float;

uniform sampler2D positionTexture;
uniform sampler2D uTexture;
uniform float uTime;

varying vec2 vUv;


float hash(vec2 p) { return fract(1e4 * sin(17.0 * p.x + p.y * 0.1) * (0.1 + abs(sin(p.y * 13.0 + p.x)))); }

void main(){
    vec2 customUv = vec2(vUv.x, vUv.y);
	vec4 textureColor = texture2D(uTexture, customUv);
	vec4 positonTextureColor = texture2D(positionTexture, customUv);

    float vel = mix(0.3, 1.2, hash(vUv ));

    float dis; 
    float negative;
    float dX;
    float dY;
    float dZ;
    if(vUv.x < 1./3.){
        dis = 1000.;
        dX = 1.0;
        dY = 0.3;
        dZ = 0.3;
        negative = 1.0;
    }else if(vUv.x< 2./3.){
        dis = 800.;
        dX = 1.0;
        dY = 0.2;
        dZ = 0.2;
        negative = 1.0;
    }else{
        dis = 550.;
        dX = 1.2;
        dY = 0.1;
        dZ = 0.1;
        negative = 1.0;
    }

    float speed = vel;
    float posX = positonTextureColor.x + speed;

    if(posX > 1000.){
        posX = -1000.;
    }


    
    float theta =  negative * (posX + 1000.)/dis * 3.15 ;

	textureColor.x = speed;
	textureColor.y = (dY * cos(theta) + dY/2. * cos(2.0 * theta) + dY/4. * cos(4.0 * theta)) * speed;
    textureColor.z = (dZ * sin(theta) + dZ/2. * sin(2.0 * theta) + dZ/4. * sin(4.0 * theta)) * speed;
    
	
	gl_FragColor = textureColor;
}
