// Referencia al contenedor donde se muestran las líneas y el resumen del pedido.
const contenidoCarrito = document.getElementById("contenido-carrito");
let mensajePersistente = "";

// Escapa los textos que vienen de la base para insertarlos como contenido HTML seguro.
function escaparHTML(valor) {
    return String(valor).replace(/[&<>"']/g, caracter => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;",
        "'": "&#39;"
    })[caracter]);
}

// Da formato de moneda consistente para los precios y subtotales del carrito.
function formatoMoneda(valor) {
    return new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
        maximumFractionDigits: 2
    }).format(valor);
}

// Renderiza cada línea, permite corregir cantidades y recalcula el total mostrado.
function renderizarCarrito(datos) {
    document.querySelectorAll(".contador-carrito").forEach(contador => {
        contador.textContent = datos.cantidad;
        contador.setAttribute("aria-label", `${datos.cantidad} artículos`);
    });

    if (!datos.items.length) {
        contenidoCarrito.innerHTML = `
            <p>Tu carrito está vacío.</p>
            <p class="mensaje-carrito" id="mensaje-carrito" role="status">${escaparHTML(mensajePersistente)}</p>
            <p><a href="/index">Volver a la tienda</a></p>
        `;
        return;
    }

    const hayStockParaTodo = datos.items.every(item =>
        Number(item.cantidad) <= Number(item.stock_disponible)
    );

    const lineas = datos.items.map(item => {
        const productoId = Number(item.id_producto);
        const cantidad = Number(item.cantidad);
        const stock = Number(item.stock_disponible);
        const alertaStock = cantidad > stock
            ? `<p role="alert">Solo hay ${stock} unidades disponibles. Ajustá la cantidad para poder finalizar.</p>`
            : "";

        return `
            <article class="linea-carrito">
                <img src="/static/img/productos/${escaparHTML(item.imagen)}" alt="${escaparHTML(item.descripcion)}" loading="lazy">
                <div class="datos-linea-carrito">
                    <h2>${escaparHTML(item.descripcion)}</h2>
                    <p>Talle: ${escaparHTML(item.talle)}</p>
                    <p>Precio unitario: <span class="precio-unitario">${formatoMoneda(Number(item.precio))}</span></p>
                    ${alertaStock}
                </div>
                <div class="controles-linea-carrito">
                    <form class="form-cantidad-carrito" data-producto="${productoId}" data-talle="${escaparHTML(item.talle)}">
                        <label for="cantidad-${productoId}-${escaparHTML(item.talle)}">Cantidad</label>
                        <input id="cantidad-${productoId}-${escaparHTML(item.talle)}" name="cantidad" type="number" min="1" max="${Math.max(stock, 1)}" value="${cantidad}" required>
                        <button type="submit">Actualizar</button>
                    </form>
                    <button type="button" data-accion="eliminar" data-producto="${productoId}" data-talle="${escaparHTML(item.talle)}">Quitar</button>
                </div>
            </article>
        `;
    }).join("");

    contenidoCarrito.innerHTML = `
        <div class="lista-carrito">${lineas}</div>
        <p class="mensaje-carrito" id="mensaje-carrito" role="status">${escaparHTML(mensajePersistente)}</p>
        <div class="resumen-carrito"><span>Subtotal del carrito</span><span class="total-carrito">${formatoMoneda(Number(datos.total))}</span></div>
        <div class="botones-carrito">
            <button type="button" data-accion="vaciar">Vaciar carrito</button>
            <button type="button" data-accion="finalizar" ${hayStockParaTodo ? "" : "disabled"}>Finalizar compra</button>
        </div>
    `;
}

// Consulta a Flask el contenido persistido para esta sesión, sin modificar existencias.
async function cargarCarrito() {
    try {
        const respuesta = await fetch("/api/carrito");
        const datos = await respuesta.json();

        if (!respuesta.ok) {
            throw new Error(datos.error || "No se pudo cargar el carrito.");
        }

        renderizarCarrito(datos);

    } catch (error) {
        contenidoCarrito.innerHTML = `<p role="alert">${escaparHTML(error.message)}</p>`;
    }
}

// Envía una acción de carrito como JSON y comunica cualquier validación de Flask.
async function enviarAccion(url, datos = {}) {
    const respuesta = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos)
    });
    const resultado = await respuesta.json();

    if (!respuesta.ok) {
        throw Object.assign(new Error(resultado.error || "No se pudo completar la acción."), {
            status: respuesta.status
        });
    }

    return resultado;
}

// Actualiza una cantidad y vuelve a pedir subtotales y total al servidor.
contenidoCarrito.addEventListener("submit", async evento => {
    const formulario = evento.target.closest(".form-cantidad-carrito");

    if (!formulario) return;

    evento.preventDefault();
    mensajePersistente = "";

    try {
        await enviarAccion("/actualizar_carrito", {
            id_producto: Number(formulario.dataset.producto),
            talla: formulario.dataset.talle,
            cantidad: Number(new FormData(formulario).get("cantidad"))
        });
        await cargarCarrito();

    } catch (error) {
        mensajePersistente = error.message;
        await cargarCarrito();
    }
});

// Un único listener atiende quitar, vaciar y finalizar, evitando duplicar manejadores.
contenidoCarrito.addEventListener("click", async evento => {
    const boton = evento.target.closest("button[data-accion]");

    if (!boton) return;

    const accion = boton.dataset.accion;
    mensajePersistente = "";
    boton.disabled = true;

    try {
        if (accion === "eliminar") {
            await enviarAccion("/eliminar_del_carrito", {
                id_producto: Number(boton.dataset.producto),
                talla: boton.dataset.talle
            });
            mensajePersistente = "Producto quitado del carrito.";
            await cargarCarrito();
            return;
        }

        if (accion === "vaciar") {
            await enviarAccion("/vaciar_carrito");
            mensajePersistente = "Carrito vaciado.";
            await cargarCarrito();
            return;
        }

        if (accion === "finalizar") {
            // Solo este endpoint confirma el pedido y descuenta existencias de SQLite.
            await enviarAccion("/finalizar_compra");
            mensajePersistente = "Compra realizada correctamente. El stock fue actualizado.";
            await cargarCarrito();
        }

    } catch (error) {
        if (error.status === 401) {
            window.location.href = "/login?next=%2Fcarrito";
            return;
        }

        mensajePersistente = error.message;
        await cargarCarrito();

    } finally {
        if (document.body.contains(boton)) boton.disabled = false;
    }
});

// La primera carga muestra el contenido actual y sincroniza el contador del encabezado.
cargarCarrito();
