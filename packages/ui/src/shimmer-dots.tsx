import { cn } from "@dub/utils";
import { useEffect, useRef } from "react";

const vertexShader = `
attribute vec2 position;

void main() 
{
    gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragmentShader = `
precision mediump float;

uniform vec2 resolution;
uniform float time;
uniform float dotSize;
uniform float cellSize;
uniform float speed;

// Gold noise: https://stackoverflow.com/a/28095165
float PHI = 1.61803398874989484820459; 
float random(in vec2 xy){
    return fract(tan(distance(xy*PHI, xy))*xy.x);
}

void main(void) {
  vec2 uv = gl_FragCoord.xy;

  vec2 cellUv = vec2(int(uv.x / cellSize), int(uv.y / cellSize));
  float id = random(cellUv);

  float fadeEffect = (sin(time * speed + id * 20.0) + 1.0) * 0.5;
  
  vec2 dotUv = fract(uv / cellSize);
  float dot = step(max(dotUv.x, dotUv.y), dotSize / cellSize);

  float opacity = dot * fadeEffect;

  vec4 fragColor = vec4(vec3(0.0), opacity);
  fragColor.rgb *= fragColor.a;

  gl_FragColor = fragColor;
}
`;

export function ShimmerDots({
  dotSize = 1,
  cellSize = 3,
  speed = 5,
  className,
}: {
  dotSize?: number;
  cellSize?: number;
  speed?: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !canvas.parentElement) return;

    const parent = canvas.parentElement;
    const devicePixelRatio = window.devicePixelRatio || 1;
    canvas.width = parent.clientWidth * devicePixelRatio;
    canvas.height = parent.clientHeight * devicePixelRatio;

    const gl = canvas.getContext("webgl");

    if (gl === null) {
      alert("Failed to initialize WebGL");
      return;
    }

    const shaderProgram = gl.createProgram();
    if (!shaderProgram) {
      console.error("Failed to create shader program");
      return;
    }

    for (let i = 0; i < 2; ++i) {
      const source = i === 0 ? vertexShader : fragmentShader;
      const shaderObj = gl.createShader(
        i === 0 ? gl.VERTEX_SHADER : gl.FRAGMENT_SHADER,
      );
      if (!shaderObj) {
        console.error("Failed to create shader");
        return;
      }
      gl.shaderSource(shaderObj, source);
      gl.compileShader(shaderObj);
      if (!gl.getShaderParameter(shaderObj, gl.COMPILE_STATUS))
        console.error(gl.getShaderInfoLog(shaderObj));
      gl.attachShader(shaderProgram, shaderObj);
      gl.linkProgram(shaderProgram);
    }

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS))
      console.error(gl.getProgramInfoLog(shaderProgram));

    const position = gl.getAttribLocation(shaderProgram, "position");
    const time = gl.getUniformLocation(shaderProgram, "time");
    const resolution = gl.getUniformLocation(shaderProgram, "resolution");
    const dotSizeUniform = gl.getUniformLocation(shaderProgram, "dotSize");
    const cellSizeUniform = gl.getUniformLocation(shaderProgram, "cellSize");
    const speedUniform = gl.getUniformLocation(shaderProgram, "speed");

    gl.useProgram(shaderProgram);

    const pos = [1.0, 1.0, -1.0, 1.0, 1.0, -1.0, -1.0, -1.0];
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pos), gl.STATIC_DRAW);

    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    gl.enable(gl.DEPTH_TEST);

    gl.uniform1f(dotSizeUniform, dotSize);
    gl.uniform1f(cellSizeUniform, cellSize);
    gl.uniform1f(speedUniform, speed);

    function render(timestamp: number) {
      if (gl && canvas && shaderProgram) {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.uniform1f(time, timestamp / 1000.0);
        gl.uniform2f(resolution, canvas.width, canvas.height);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
      requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
  }, []);

  return (
    <div className={cn("absolute inset-0", className)}>
      <canvas
        ref={canvasRef}
        width="100%"
        height="100%"
        className="size-full"
      />
    </div>
  );
}
