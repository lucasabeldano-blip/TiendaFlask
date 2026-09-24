// Referencia al formulario para escuchar su envío y validar sus datos.
const formulario = document.getElementById("register");

// El evento submit centraliza el flujo de registro en una sola función.
formulario.addEventListener("submit", async function(event) {
    // Evita el envío HTML tradicional y la recarga de la página.
    event.preventDefault();

    // Captura los valores introducidos por el usuario.
    const usuario = document.getElementById("usuario").value;
    const contraseña = document.getElementById("contraseña").value;
    const confirmarContraseña = document.getElementById("confirmar_contraseña").value;

    const resultado = document.getElementById("resultado");

    
    // Validación local: compara dos valores antes de contactar al servidor.
    if (contraseña !== confirmarContraseña) {
        resultado.textContent = "Las contraseñas no coinciden";
        // return funciona como salida anticipada para detener el flujo.
        return;
    }

    // Envía los datos válidos mediante una petición POST con formato JSON.
    const respuesta = await fetch("/register", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        // JSON.stringify serializa el objeto JavaScript para transportarlo por HTTP.
        body: JSON.stringify({
            usuario: usuario,
            contraseña: contraseña
        })
    });

    // Convierte la respuesta del servidor en un objeto utilizable por JavaScript.
    const datos = await respuesta.json();

    // respuesta.ok permite elegir entre el camino exitoso y el camino de error.
    if (respuesta.ok) {
        resultado.textContent = "Usuario registrado correctamente";

       
        // setTimeout retrasa la redirección para que el mensaje sea visible.
        setTimeout(function() {
            window.location.href = "/index";
        }, 1000);

    } else {
        resultado.textContent = datos.error;
    }
});