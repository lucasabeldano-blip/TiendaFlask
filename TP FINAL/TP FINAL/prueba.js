const dock = document.querySelector(".dock");
const items = document.querySelectorAll(".dock-item");

dock.addEventListener("mousemove", (e) => {

    items.forEach(item => {

        const rect = item.getBoundingClientRect();

        const centro = rect.left + rect.width / 2;

        const distancia = Math.abs(e.clientX - centro);

        const distanciaMaxima = 150;

        let tamaño = 50;

        if (distancia < distanciaMaxima) {

            const porcentaje =
                1 - (distancia / distanciaMaxima);

            tamaño = 50 + (40 * porcentaje);
        }

        item.style.width = `${tamaño}px`;
        item.style.height = `${tamaño}px`;

    });

});


dock.addEventListener("mouseleave", () => {

    items.forEach(item => {

        item.style.width = "50px";
        item.style.height = "50px";

    });

});


const container = document.getElementById("ghost-fibers");

const canvas = document.createElement("canvas");
container.appendChild(canvas);

const gl = canvas.getContext("webgl2");

if (!gl) {

    console.error("Tu navegador no soporta WebGL2.");

} else {

    // =========================
    // CONFIGURACIÓN
    // =========================

    const config = {

        lineColor: "#140E35",
        glowColor: "#3437A0",

        speed: 0.2,
        scale: 2,

        rotation: 0,
        rotationSpeed: 0.25,

        layers: 5,

        waveAmplitude: 0.015,
        waveFrequency: 3,
        waveSpeed: 0.15,
        layerSpeed: 0.08,

        twist: 0.1,
        twistFrequency: 5,
        twistSpeed: 1.2,

        lineFrequency: 5,
        lineSpacing: 2,
        lineSharpness: 16,

        glowFalloff: 10,
        glowIntensity: 1.6,

        brightness: 2,
        blueBoost: 1.25,

        vignette: 0.8,
        grain: 0.05

    };


    // =========================
    // CONVERTIR HEX A RGB
    // =========================

    function hexToRgb(hex) {

        hex = hex.replace("#", "");

        if (hex.length === 3) {

            hex = hex
                .split("")
                .map(x => x + x)
                .join("");

        }

        return [

            parseInt(hex.substring(0, 2), 16) / 255,

            parseInt(hex.substring(2, 4), 16) / 255,

            parseInt(hex.substring(4, 6), 16) / 255

        ];

    }


    // =========================
    // SHADERS
    // =========================

    const vertexShaderSource = `#version 300 es

        in vec2 position;

        void main() {

            gl_Position = vec4(position, 0.0, 1.0);

        }

    `;


    const fragmentShaderSource = `#version 300 es

        precision highp float;


        uniform vec2 uResolution;
        uniform float uTime;

        uniform float uSpeed;
        uniform float uScale;

        uniform float uRotation;
        uniform float uRotationSpeed;

        uniform float uLayers;

        uniform float uWaveAmplitude;
        uniform float uWaveFrequency;

        uniform float uWaveSpeed;
        uniform float uLayerSpeed;

        uniform float uTwist;
        uniform float uTwistFrequency;
        uniform float uTwistSpeed;

        uniform float uLineFrequency;
        uniform float uLineSpacing;
        uniform float uLineSharpness;

        uniform float uGlowFalloff;
        uniform float uGlowIntensity;

        uniform float uBrightness;
        uniform float uBlueBoost;

        uniform float uVignette;
        uniform float uGrain;

        uniform vec3 uLineColor;
        uniform vec3 uGlowColor;


        out vec4 fragColor;


        #define MAX_LAYERS 10


        mat2 rotate2d(float angle) {

            float s = sin(angle);
            float c = cos(angle);

            return mat2(
                c, -s,
                s, c
            );

        }


        float grainHash(vec2 point) {

            point = floor(point);

            float hash =
                52.9829189 *
                fract(
                    dot(
                        point,
                        vec2(0.065, 0.005)
                    )
                );

            return fract(hash);

        }


        float layeredGrain(vec2 pixel) {

            vec2 point =
                mod(
                    pixel +
                    vec2(
                        uTime * 30.0,
                        -uTime * 21.0
                    ),
                    1024.0
                );

            vec2 rotated =
                mat2(
                    0.8, -0.5,
                    0.5, 0.8
                ) * point;


            float grain = 0.0;

            grain +=
                0.40 *
                grainHash(rotated);

            grain +=
                0.25 *
                grainHash(rotated * 2.0 + 17.0);

            grain +=
                0.20 *
                grainHash(rotated * 4.0 + 47.0);

            grain +=
                0.10 *
                grainHash(rotated * 8.0 + 113.0);

            grain +=
                0.05 *
                grainHash(rotated * 16.0 + 191.0);

            return grain;

        }


        void main() {

            vec2 resolution =
                max(
                    uResolution,
                    vec2(1.0)
                );


            vec2 uv =
                (
                    2.0 *
                    gl_FragCoord.xy -
                    resolution
                )
                /
                resolution.y;


            float time =
                uTime *
                uSpeed;


            vec3 backdrop =
                vec3(
                    0.070588,
                    0.058824,
                    0.090196
                );


            vec3 centerTone =
                max(
                    uLineColor * 0.85567 -
                    uGlowColor * 0.06186,
                    vec3(0.0)
                );


            vec3 cloudTone =
                uLineColor * 0.19588 +
                uGlowColor * 0.2268;


            vec2 p = uv;


            p /=
                max(
                    uScale,
                    0.05
                );


            p =
                rotate2d(
                    radians(uRotation) +
                    time * uRotationSpeed
                )
                *
                p;


            vec3 color =
                vec3(0.0);


            float fiberField = 0.0;


            for (
                int index = 0;
                index < MAX_LAYERS;
                index++
            ) {

                float fi =
                    float(index) + 1.0;


                if (fi > uLayers)
                    break;


                p +=
                    uWaveAmplitude *
                    sin(
                        p.yx *
                        fi *
                        uWaveFrequency
                        +
                        time *
                        (
                            uWaveSpeed +
                            fi *
                            uLayerSpeed
                        )
                    );


                float radius =
                    length(p);


                float polarAngle =
                    atan(
                        p.y,
                        p.x
                    );


                polarAngle +=
                    sin(
                        radius *
                        uTwistFrequency
                        -
                        time *
                        uTwistSpeed
                        +
                        fi
                    )
                    *
                    uTwist;


                p =
                    vec2(
                        cos(polarAngle),
                        sin(polarAngle)
                    )
                    *
                    radius;


                float lines =
                    abs(
                        sin(
                            p.x *
                            (
                                uLineFrequency +
                                fi *
                                uLineSpacing
                            )
                            +
                            sin(
                                p.y * 3.0 +
                                time
                            )
                        )
                    );


                lines =
                    pow(
                        max(
                            0.0,
                            1.0 - lines
                        ),
                        uLineSharpness
                    );


                fiberField +=
                    lines / fi;


                color +=
                    uLineColor *
                    lines /
                    fi;


                float glow =
                    exp(
                        -uGlowFalloff *
                        abs(
                            sin(
                                p.x * 3.0 +
                                time +
                                fi
                            )
                        )
                    );


                color +=
                    uGlowColor *
                    glow *
                    uGlowIntensity /
                    (fi * 2.0);

            }


            float center =
                exp(
                    -2.2 *
                    dot(uv, uv)
                );


            color +=
                centerTone *
                center;


            float cloud =
                exp(
                    -1.5 *
                    length(
                        uv +
                        vec2(
                            sin(time * 0.3) * 0.25,
                            cos(time * 0.25) * 0.18
                        )
                    )
                );


            color +=
                cloudTone *
                cloud;


            float vignette =
                1.0 -
                smoothstep(
                    0.35,
                    1.45,
                    length(uv)
                );


            color *=
                mix(
                    1.0 - uVignette,
                    1.0,
                    vignette
                );


            color =
                1.0 -
                exp(
                    -color *
                    uBrightness
                );


            color.b *=
                uBlueBoost;


            float noise =
                (
                    layeredGrain(
                        gl_FragCoord.xy
                    )
                    -
                    0.5
                )
                *
                uGrain;


            color += noise;


            color =
                clamp(
                    color,
                    0.0,
                    1.0
                );


            fragColor =
                vec4(
                    color,
                    1.0
                );

        }

    `;


    // =========================
    // CREAR SHADER
    // =========================

    function crearShader(type, source) {

        const shader =
            gl.createShader(type);

        gl.shaderSource(
            shader,
            source
        );

        gl.compileShader(shader);


        if (
            !gl.getShaderParameter(
                shader,
                gl.COMPILE_STATUS
            )
        ) {

            console.error(
                gl.getShaderInfoLog(shader)
            );

            gl.deleteShader(shader);

            return null;

        }


        return shader;

    }


    const vertexShader =
        crearShader(
            gl.VERTEX_SHADER,
            vertexShaderSource
        );


    const fragmentShader =
        crearShader(
            gl.FRAGMENT_SHADER,
            fragmentShaderSource
        );


    const program =
        gl.createProgram();


    gl.attachShader(
        program,
        vertexShader
    );

    gl.attachShader(
        program,
        fragmentShader
    );


    gl.linkProgram(program);


    if (
        !gl.getProgramParameter(
            program,
            gl.LINK_STATUS
        )
    ) {

        console.error(
            gl.getProgramInfoLog(program)
        );

    }


    gl.useProgram(program);


    // =========================
    // TRIÁNGULO QUE OCUPA TODO
    // =========================

    const vertices = new Float32Array([

        -1, -1,
         3, -1,
        -1,  3

    ]);


    const buffer =
        gl.createBuffer();


    gl.bindBuffer(
        gl.ARRAY_BUFFER,
        buffer
    );


    gl.bufferData(
        gl.ARRAY_BUFFER,
        vertices,
        gl.STATIC_DRAW
    );


    const position =
        gl.getAttribLocation(
            program,
            "position"
        );


    gl.enableVertexAttribArray(
        position
    );


    gl.vertexAttribPointer(
        position,
        2,
        gl.FLOAT,
        false,
        0,
        0
    );


    // =========================
    // UNIFORMS
    // =========================

    const uniforms = {};


    const nombres = [

        "uResolution",
        "uTime",

        "uSpeed",
        "uScale",

        "uRotation",
        "uRotationSpeed",

        "uLayers",

        "uWaveAmplitude",
        "uWaveFrequency",

        "uWaveSpeed",
        "uLayerSpeed",

        "uTwist",
        "uTwistFrequency",
        "uTwistSpeed",

        "uLineFrequency",
        "uLineSpacing",
        "uLineSharpness",

        "uGlowFalloff",
        "uGlowIntensity",

        "uBrightness",
        "uBlueBoost",

        "uVignette",
        "uGrain"

    ];


    nombres.forEach(nombre => {

        uniforms[nombre] =
            gl.getUniformLocation(
                program,
                nombre
            );

    });


    uniforms.uLineColor =
        gl.getUniformLocation(
            program,
            "uLineColor"
        );


    uniforms.uGlowColor =
        gl.getUniformLocation(
            program,
            "uGlowColor"
        );


    // =========================
    // COLORES
    // =========================

    const lineColor =
        hexToRgb(
            config.lineColor
        );


    const glowColor =
        hexToRgb(
            config.glowColor
        );


    gl.uniform3fv(
        uniforms.uLineColor,
        lineColor
    );


    gl.uniform3fv(
        uniforms.uGlowColor,
        glowColor
    );


    // =========================
    // CONFIGURAR VALORES
    // =========================

    gl.uniform1f(
        uniforms.uSpeed,
        config.speed
    );

    gl.uniform1f(
        uniforms.uScale,
        config.scale
    );

    gl.uniform1f(
        uniforms.uRotation,
        config.rotation
    );

    gl.uniform1f(
        uniforms.uRotationSpeed,
        config.rotationSpeed
    );

    gl.uniform1f(
        uniforms.uLayers,
        config.layers
    );

    gl.uniform1f(
        uniforms.uWaveAmplitude,
        config.waveAmplitude
    );

    gl.uniform1f(
        uniforms.uWaveFrequency,
        config.waveFrequency
    );

    gl.uniform1f(
        uniforms.uWaveSpeed,
        config.waveSpeed
    );

    gl.uniform1f(
        uniforms.uLayerSpeed,
        config.layerSpeed
    );

    gl.uniform1f(
        uniforms.uTwist,
        config.twist
    );

    gl.uniform1f(
        uniforms.uTwistFrequency,
        config.twistFrequency
    );

    gl.uniform1f(
        uniforms.uTwistSpeed,
        config.twistSpeed
    );

    gl.uniform1f(
        uniforms.uLineFrequency,
        config.lineFrequency
    );

    gl.uniform1f(
        uniforms.uLineSpacing,
        config.lineSpacing
    );

    gl.uniform1f(
        uniforms.uLineSharpness,
        config.lineSharpness
    );

    gl.uniform1f(
        uniforms.uGlowFalloff,
        config.glowFalloff
    );

    gl.uniform1f(
        uniforms.uGlowIntensity,
        config.glowIntensity
    );

    gl.uniform1f(
        uniforms.uBrightness,
        config.brightness
    );

    gl.uniform1f(
        uniforms.uBlueBoost,
        config.blueBoost
    );

    gl.uniform1f(
        uniforms.uVignette,
        config.vignette
    );

    gl.uniform1f(
        uniforms.uGrain,
        config.grain
    );


    // =========================
    // RESIZE
    // =========================

    function resize() {

        const dpr =
            Math.min(
                window.devicePixelRatio || 1,
                2
            );


        canvas.width =
            container.clientWidth *
            dpr;


        canvas.height =
            container.clientHeight *
            dpr;


        gl.viewport(
            0,
            0,
            canvas.width,
            canvas.height
        );


        gl.uniform2f(
            uniforms.uResolution,
            canvas.width,
            canvas.height
        );

    }


    window.addEventListener(
        "resize",
        resize
    );


    resize();


    // =========================
    // ANIMACIÓN
    // =========================

    let startTime =
        performance.now();


    function animar() {

        const ahora =
            performance.now();


        const tiempo =
            (ahora - startTime)
            / 1000;


        gl.uniform1f(
            uniforms.uTime,
            tiempo
        );


        gl.drawArrays(
            gl.TRIANGLES,
            0,
            3
        );


        requestAnimationFrame(
            animar
        );

    }


    animar();

}

