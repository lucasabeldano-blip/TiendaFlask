const formulario = document.getElementById("register");

formulario.addEventListener("submit", async function(event) {
    event.preventDefault();

    const usuario = document.getElementById("usuario").value;
    const contraseña = document.getElementById("contraseña").value;
    const confirmarContraseña = document.getElementById("confirmar_contraseña").value;

    const resultado = document.getElementById("resultado");

    
    if (contraseña !== confirmarContraseña) {
        resultado.textContent = "Las contraseñas no coinciden";
        return;
    }

    const respuesta = await fetch("/register", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            usuario: usuario,
            contraseña: contraseña
        })
    });

    const datos = await respuesta.json();

    if (respuesta.ok) {
        resultado.textContent = "Usuario registrado correctamente";

       
        setTimeout(function() {
            window.location.href = "/login";
        }, 1000);

    } else {
        resultado.textContent = datos.error;
    }
});