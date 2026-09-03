    const formulario = document.getElementById("cambiarPass");

    formulario.addEventListener("submit", async function(event) {

        event.preventDefault();

        const usuario = document.getElementById("usuario").value;
        const contraseñaActual = document.getElementById("contraseña_actual").value;
        const contraseñaNueva = document.getElementById("contraseña_nueva").value;
        const confirmarContraseña = document.getElementById("confirmar_contraseña_nueva").value;

        const resultado = document.getElementById("resultado");


        if (contraseñaNueva !== confirmarContraseña) {

            resultado.textContent = "Las nuevas contraseñas no coinciden";
            return;

        }

        const respuesta = await fetch("/cambiarpass", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                usuario: usuario,
                contraseñaActual: contraseñaActual,
                contraseñaNueva: contraseñaNueva
            })

        });


        const datos = await respuesta.json();


        if (respuesta.ok) {

            resultado.textContent = "Contraseña cambiada correctamente";

        } else {

            resultado.textContent = datos.error;

        }

    });