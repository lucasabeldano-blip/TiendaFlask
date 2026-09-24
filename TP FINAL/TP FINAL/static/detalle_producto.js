const botonComprar = document.getElementById("comprar-detalle");
const selectorTalla = document.getElementById("talla");
const mensajeCompra = document.getElementById("mensaje-compra");

botonComprar.addEventListener("click", async () => {

    const talla = selectorTalla.value;

    if (!talla) {
        mensajeCompra.textContent = "Seleccioná un talle para continuar.";
        return;
    }

    botonComprar.disabled = true;
    mensajeCompra.textContent = "Procesando compra...";

    try {

        const respuesta = await fetch("/api/comprar", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                id_producto: Number(botonComprar.dataset.producto),
                talla: talla
            })
        });

        const contenido = await respuesta.text();
        let datos;

        try {
            datos = JSON.parse(contenido);
        } catch (error) {
            throw new Error("El servidor devolvió un error inesperado.");
        }

        if (respuesta.status === 401) {
            window.location.href = "/login";
            return;
        }

        if (respuesta.ok) {
            mensajeCompra.textContent = `Compra realizada correctamente. Talle elegido: ${talla}.`;
        } else {
            mensajeCompra.textContent = datos.error;
            botonComprar.disabled = false;
        }

    } catch (error) {
        mensajeCompra.textContent = error.message;
        botonComprar.disabled = false;
    }

});
