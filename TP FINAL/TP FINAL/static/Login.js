// Obtiene el formulario para asociar la acción de inicio de sesión al evento submit.
const formulario = document.getElementById("Login");
console.log("Login.js cargado");
// Patrón orientado a eventos: la función se ejecuta cuando el usuario envía el formulario.
formulario.addEventListener("submit", Iniciar);

// Envía las credenciales y decide la vista según el rol recibido.
async function Iniciar(event) {

    // Evita la recarga automática y permite controlar la petición con fetch.
    event.preventDefault();

    // Lee los valores desde el DOM mediante los identificadores de los inputs.
    const usuario = document.getElementById("usuario").value;
    const contraseña = document.getElementById("contraseña").value;

    console.log("Usuario:", usuario);
    console.log("Contraseña:", contraseña);

    // fetch realiza una petición POST asíncrona al endpoint de autenticación.
    const respuesta = await fetch("/login", {
        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        // JSON.stringify convierte el objeto en texto JSON para enviarlo por HTTP.
        body: JSON.stringify({
            usuario: usuario,
            contraseña: contraseña
        })
    });

    // La respuesta JSON se transforma en un objeto JavaScript.
    const datos = await respuesta.json();
    console.log(datos);

    // La decisión condicional separa autenticación exitosa y error.
    if (respuesta.ok) {

        // El rol funciona como dato de control para redirigir a cada tipo de usuario.
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