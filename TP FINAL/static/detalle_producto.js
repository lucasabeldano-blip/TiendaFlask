// Referencias a los controles del detalle para validar antes de llamar al servidor.
const botonComprar = document.getElementById("comprar-detalle");
const selectorTalla = document.getElementById("talla");
const mensajeCompra = document.getElementById("mensaje-compra");

// La compra solo se prepara aquí; las existencias cambian al finalizar el carrito.
botonComprar.addEventListener("click", async () => {

    const talla = selectorTalla.value;

    if (!talla) {
        mensajeCompra.textContent = "Seleccioná un talle antes de agregar el producto.";
        return;
    }

    botonComprar.disabled = true;
    mensajeCompra.textContent = "Agregando al carrito...";

    try {

        // El navegador envía producto y talle; Flask registra la línea sin descontar stock.
        const respuesta = await fetch("/agregar_al_carrito", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                id_producto: Number(botonComprar.dataset.producto),
                talla: talla,
                cantidad: 1
            })
        });

        const contenido = await respuesta.text();
        let datos;

        try {
            datos = JSON.parse(contenido);
        } catch (error) {
            throw new Error("El servidor devolvió un error inesperado.");
        }

        if (respuesta.ok) {
            // El servidor devuelve el total para refrescar el contador sin recargar la página.
            document.querySelectorAll(".contador-carrito").forEach(contador => {
                contador.textContent = datos.cantidad;
                contador.setAttribute("aria-label", `${datos.cantidad} artículos`);
            });
            mensajeCompra.textContent = `Agregado al carrito. Talle: ${talla}. El stock se descuenta al finalizar la compra.`;
        } else {
            mensajeCompra.textContent = datos.error;
        }

    } catch (error) {
        mensajeCompra.textContent = error.message;

    } finally {
        botonComprar.disabled = false;
    }

});
