var gl;

var lightPosition = vec4(1.0, 1.0, 1.0, 0.0 );
var lightAmbient = vec4(0.2, 0.2, 0.2, 1.0 );
var lightDiffuse = vec4( 1.0, 1.0, 1.0, 1.0 );
var lightSpecular = vec4( 1.0, 1.0, 1.0, 1.0 );

var materialAmbient = vec4( 1.0, 0.0, 1.0, 1.0 );
var materialDiffuse = vec4( 1.0, 0.8, 0.0, 1.0 );
var materialSpecular = vec4( 1.0, 1.0, 1.0, 1.0 );
var materialShininess = 20.0;

var ctm;
var ambientColor, diffuseColor, specularColor;


var nRows = 50;
var nColumns = 50;

// data for radial hat function: sin(Pi*r)/(Pi*r)

var data = [];
for( var i = 0; i < nRows; ++i ) {
    data.push( [] );
    var x = Math.PI*(4*i/nRows-2.0);
    
    for( var j = 0; j < nColumns; ++j ) {
        var y = Math.PI*(4*j/nRows-2.0);
        var r = Math.sqrt(x*x+y*y);
        
        // take care of 0/0 for r = 0
        
        data[i][j] = r ? Math.sin(r) / r : 1.0;
    }
}

var pointsArray = [];

var fColor;

var near = -10;
var far = 10;
var radius = 6.0;
var theta  = 0.0;
var phi    = 0.0;
var dr = 5.0 * Math.PI/180.0;

const black = vec4(0.0, 0.0, 0.0, 1.0);
const red = vec4(1.0, 0.0, 0.0, 1.0);

const at = vec3(0.0, 0.0, 0.0);
const up = vec3(0.0, 1.0, 0.0);

var left = -2.0;
var right = 2.0;
var ytop = 2.0;
var bottom = -2.0;

var modelViewMatrix, projectionMatrix;
var modelViewMatrixLoc, projectionMatrixLoc;

var texSize = 256;
var numChecks = 16;
var texCoordsArray = [];
var normalsArray = [];
var texture1, texture2;
var texCoord = [
vec2(0, 0),
vec2(0, 1),
vec2(1, 1),
vec2(1, 0)
];

function configureTexture() {
	texture1 = gl.createTexture();
	gl.bindTexture( gl.TEXTURE_2D, texture1 );
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize, texSize, 0, gl.RGBA, gl.UNSIGNED_BYTE, image1);
	gl.generateMipmap( gl.TEXTURE_2D );
	gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER,
	gl.NEAREST_MIPMAP_LINEAR );
	gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	texture2 = gl.createTexture();
	gl.bindTexture( gl.TEXTURE_2D, texture2 );
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize, texSize, 0, gl.RGBA, gl.UNSIGNED_BYTE, image2);
	gl.generateMipmap( gl.TEXTURE_2D );
	gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER,
	gl.NEAREST_MIPMAP_LINEAR );
	gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
}

var image1 = new Uint8Array(4*texSize*texSize);
for ( var i = 0; i < texSize; i++ ) {
	for ( var j = 0; j <texSize; j++ ) {
		var patchx = Math.floor(i/(texSize/numChecks));
		if(patchx%2) c = 255;
		else c = 0;
		image1[4*i*texSize+4*j] = c;
		image1[4*i*texSize+4*j+1] = c;
		image1[4*i*texSize+4*j+2] = c;
		image1[4*i*texSize+4*j+3] = 255;
	}
}
var image2 = new Uint8Array(4*texSize*texSize);
// Create a checkerboard pattern
for ( var i = 0; i < texSize; i++ ) {
	for ( var j = 0; j <texSize; j++ ) {
		var patchy = Math.floor(j/(texSize/numChecks));
		if(patchy%2) c = 255;
		else c = 0;
		image2[4*i*texSize+4*j] = c;
		image2[4*i*texSize+4*j+1] = c;
		image2[4*i*texSize+4*j+2] = c;
		image2[4*i*texSize+4*j+3] = 255;
	}
}

var hatVertices = 0;
var light;
var m;

window.onload = function init()
{
    var canvas = document.getElementById( "gl-canvas" );
    
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    gl.viewport( 0, 0, canvas.width, canvas.height );
    
    gl.clearColor( 1.0, 1.0, 1.0, 1.0 );
    
    // enable depth testing and polygon offset
    // so lines will be in front of filled triangles
    
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(1.0, 2.0);

		light = vec3(0.0, 2.0, 0.0);

		// matrix for shadow projection

		m = mat4();
		m[3][3] = 0;
		m[3][1] = -1/light[1];
	

// vertex array of nRows*nColumns quadrilaterals 
// (two triangles/quad) from data
    
    for(var i=0; i<nRows-1; i++) {
        for(var j=0; j<nColumns-1;j++) {
            pointsArray.push( vec4(2*i/nRows-1, data[i][j], 2*j/nColumns-1, 1.0));
            pointsArray.push( vec4(2*(i+1)/nRows-1, data[i+1][j], 2*j/nColumns-1, 1.0)); 
            pointsArray.push( vec4(2*(i+1)/nRows-1, data[i+1][j+1], 2*(j+1)/nColumns-1, 1.0));
            pointsArray.push( vec4(2*i/nRows-1, data[i][j+1], 2*(j+1)/nColumns-1, 1.0) );
						hatVertices+=4;
    	}
		}
    //
    //  Load shaders and initialize attribute buffers
    //
    var program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );

    ambientProduct = mult(lightAmbient, materialAmbient);
    diffuseProduct = mult(lightDiffuse, materialDiffuse);
    specularProduct = mult(lightSpecular, materialSpecular);

		pointsArray.push(vec4( -0.5, 0.5,  -0.5, 1.0 ));     
		pointsArray.push(vec4( -0.5,  0.5,  0.5, 1.0 ));  
		pointsArray.push(vec4( 0.5, 0.5,  0.5, 1.0 ));
		pointsArray.push(vec4( 0.5,  0.5,  -0.5, 1.0 ));

    var vBufferId = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, vBufferId );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);
    
    var vPosition = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( vPosition, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );

		fColor = gl.getUniformLocation(program, "fColor");

    modelViewMatrixLoc = gl.getUniformLocation( program, "modelViewMatrix" );
    projectionMatrixLoc = gl.getUniformLocation( program, "projectionMatrix" );
    window.onkeydown = function( event ) {
      switch( event.keyCode ) {
        //left
        case 37:
          theta -= dr;
          break;
        //up
        case 38:
          phi += dr;
          break;
        //right
        case 39:
          theta += dr;
          break;
        //down
        case 40:
          phi -= dr;
          break;
      } 
    }

		configureTexture();
		gl.activeTexture( gl.TEXTURE0 );
		gl.bindTexture( gl.TEXTURE_2D, texture1 );
		gl.uniform1i(gl.getUniformLocation( program, "Tex0"), 0);
		gl.activeTexture( gl.TEXTURE1 );
		gl.bindTexture( gl.TEXTURE_2D, texture2 );
		gl.uniform1i(gl.getUniformLocation( program, "Tex1"), 1);

    gl.uniform4fv( gl.getUniformLocation(program, 
       "ambientProduct"),flatten(ambientProduct) );
    gl.uniform4fv( gl.getUniformLocation(program, 
       "diffuseProduct"),flatten(diffuseProduct) );
    gl.uniform4fv( gl.getUniformLocation(program, 
       "specularProduct"),flatten(specularProduct) );	
    gl.uniform4fv( gl.getUniformLocation(program, 
       "lightPosition"),flatten(lightPosition) );
    gl.uniform1f( gl.getUniformLocation(program, 
       "shininess"),materialShininess );

    render();
}

function render()
{
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
 

    var eye = vec3( radius*Math.sin(theta)*Math.cos(phi), 
                    radius*Math.sin(theta)*Math.sin(phi),
                    radius*Math.cos(theta));
		
		modelViewMatrix = lookAt(eye, at, up);

		light[0] = Math.sin(theta);
		light[2] = Math.cos(theta);

    modelViewMatrix = mult(modelViewMatrix, translate(light[0], light[1], light[2]));
		modelViewMatrix = mult(modelViewMatrix, m);
		modelViewMatrix = mult(modelViewMatrix, translate(-light[0], -light[1], -light[2]));
		projectionMatrix = ortho( left, right, bottom, ytop, near, far );
    
    gl.uniformMatrix4fv( modelViewMatrixLoc, false, flatten(modelViewMatrix) );
    gl.uniformMatrix4fv( projectionMatrixLoc, false, flatten(projectionMatrix) );

    // draw each quad as two filled red triangles
    // and then as two black line loops
    
    for(var i=0; i<hatVertices; i+=4) { 
        gl.uniform4fv(fColor, flatten(red));
        gl.drawArrays( gl.TRIANGLE_FAN, i, 4 );
        gl.uniform4fv(fColor, flatten(black));
        gl.drawArrays( gl.LINE_LOOP, i, 4 );
    }
   
	 	gl.drawArrays(gl.TRIANGLES, 0 ,4);

    requestAnimFrame(render);
}
