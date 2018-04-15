precision highp float;

uniform sampler2D velocityTexture;
uniform sampler2D uTexture;
// uniform bool uIsFirst;
varying vec2 vUv;

void main(){
    
	vec2 customUv = vec2(vUv.x, 1.0 - vUv.y);
    vec4 velocity = texture2D( velocityTexture, customUv );
	vec4 position = texture2D( uTexture, customUv );
    
  
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

        float posX = position.x + 1000.;
        float theta = negative * posX / dis * 3.15 ;
        float posY = negative * dY * dis / 3.15 * ( sin(theta)  +  1./4. * sin(2.0 * theta ) + 1./16. * sin(4.0 * theta) );
        float posZ = negative * dZ * dis / 3.15 * ( -cos(theta) - 1./4. * cos(2.0 * theta ) - 1./16. * cos(4.0 * theta) + 21./16. * cos(0.));

        //vec4 viewPositon =  //(position + vec4(0., posY, posZ, 0.0));
        position.y = posY;
        position.z = posZ;
    //}

	gl_FragColor = position;
    
    gl_FragColor.a = atan(velocity.y, velocity.x);
}
