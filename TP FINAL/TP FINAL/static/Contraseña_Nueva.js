    // Busca el formulario en el DOM para asociarle un comportamiento personalizado.
    const formulario = document.getElementById("cambiarPass");

    // Patrón orientado a eventos: la función se ejecuta cuando el usuario envía el formulario.
    formulario.addEventListener("submit", async function(event) {

        // Evita la recarga y el envío tradicional para procesar la petición con fetch.
        event.preventDefault();

        // Se leen los valores del formulario mediante sus identificadores únicos.
        const usuario = document.getElementById("usuario").value;
        const contraseñaActual = document.getElementById("contraseña_actual").value;
        const contraseñaNueva = document.getElementById("contraseña_nueva").value;
        const confirmarContraseña = document.getElementById("confirmar_contraseña_nueva").value;

        // Este elemento muestra al usuario el resultado de la validación o de la API.
        const resultado = document.getElementById("resultado");


        // Validación local: evita una petición innecesaria si las contraseñas no coinciden.
        // Concepto: comparación de valores y salida anticipada con return.
        if (contraseñaNueva !== confirmarContraseña) {

            resultado.textContent = "Las nuevas contraseñas no coinciden";
            return;

        }

        // fetch realiza una petición HTTP asíncrona al endpoint de Flask.
        const respuesta = await fetch("/cambiarpass", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            // JSON.stringify serializa el objeto para enviarlo como texto JSON.
            body: JSON.stringify({
                usuario: usuario,
                contraseñaActual: contraseñaActual,
                contraseñaNueva: contraseñaNueva
            })

        });


        // La respuesta se transforma de JSON a un objeto JavaScript.
        const datos = await respuesta.json();


        // respuesta.ok permite separar el camino exitoso del camino de error.
        if (respuesta.ok) {

            resultado.textContent = "Contraseña cambiada correctamente";

        } else {

            resultado.textContent = datos.error;

        }

    });