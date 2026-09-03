const formulario = document.getElementById("Login");
console.log("Login.js cargado");
formulario.addEventListener("submit", Iniciar);

async function Iniciar(event) {

    event.preventDefault();

    const usuario = document.getElementById("usuario").value;
    const contraseña = document.getElementById("contraseña").value;

    console.log("Usuario:", usuario);
    console.log("Contraseña:", contraseña);

    const respuesta = await fetch("/login", {
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
    console.log(datos);

    if (respuesta.ok) {

        if (datos.rol === "admin") {
            window.location.href = "/admin";
        }

        else if (datos.rol === "cliente") {
            window.location.href = "/index";
        }

    } else {

        alert(datos.error);

    }
}