
// Solicita los productos y construye la vista de la tienda a partir de la respuesta.
let productos = [];
let productoActual = 0;

// Carga los productos y prepara el carrusel.
async function cargarProductos() {

    const categoriaActual = new URLSearchParams(window.location.search).get("categoria") || "";
    const urlProductos = categoriaActual
        ? `/api/productos-tienda?categoria=${encodeURIComponent(categoriaActual)}`
        : "/api/productos-tienda";

    // GET obtiene la colección de productos disponibles para los clientes.
    const respuesta = await fetch(urlProductos);

    // La respuesta JSON se almacena como una estructura de datos iterable.
    productos = await respuesta.json();


    if (!respuesta.ok) {

        alert(productos.error);

        return;

    }


    // Selecciona el nodo donde se insertarán las tarjetas generadas.
    const contenedor =
        document.getElementById("productos");


    productoActual = 0;
    renderizarCarrusel();

}

function renderizarCarrusel() {

    const contenedor = document.getElementById("productos");

    const tarjetas = productos.map(producto => `

            <article>

                <img
                    class="imagen-producto"
                    src="/static/img/productos/${producto.imagen}"
                    alt="${producto.descripcion}"
                >

                <h1>
                    ${producto.descripcion}
                </h1>

                <h2>
                    Precio: $${producto.precio}
                </h2>

                <p>
                    Unidades disponibles:
                    ${producto.unidades_disponibles}
                </p>

                <button onclick="verDetalle(${producto.id_producto})">
                    Comprar
                </button>

            </article>

        `).join("") + `
        <article class="tarjeta-categorias">
            <h1>Buscar por categoría</h1>
            <p>Encontrá prendas según el estilo que buscás.</p>
            <button type="button" onclick="irABuscadorCategorias()">
                Ver categorías
            </button>
        </article>
    `;

    const cantidadTarjetas = productos.length + 1;

    const indicadores = Array.from({ length: cantidadTarjetas }, (_, indice) => `
        <button
            class="indicador-carrusel${indice === productoActual ? " activo" : ""}"
            type="button"
            aria-label="${indice < productos.length ? `Ver producto ${indice + 1}` : "Buscar por categoría"}"
            data-indice="${indice}"
        ></button>
    `).join("");


    contenedor.innerHTML = `
        <button class="flecha-carrusel anterior" type="button" aria-label="Producto anterior">&#8249;</button>
        <div class="ventana-carrusel">
            <div class="pista-carrusel">${tarjetas}</div>
        </div>
        <button class="flecha-carrusel siguiente" type="button" aria-label="Producto siguiente">&#8250;</button>
        <div class="indicadores-carrusel" aria-label="Productos">${indicadores}</div>
    `;

    contenedor.querySelector(".anterior").addEventListener("click", () => cambiarProducto(-1));
    contenedor.querySelector(".siguiente").addEventListener("click", () => cambiarProducto(1));

    contenedor.querySelectorAll(".indicador-carrusel").forEach(indicador => {
        indicador.addEventListener("click", () => {
            productoActual = Number(indicador.dataset.indice);
            actualizarCarrusel();
        });
    });

    contenedor.tabIndex = 0;
    contenedor.addEventListener("keydown", evento => {
        if (evento.key === "ArrowLeft") cambiarProducto(-1);
        if (evento.key === "ArrowRight") cambiarProducto(1);
    });

    agregarGestosCarrusel(contenedor);
    actualizarCarrusel();

}

function verDetalle(id_producto) {

    window.location.href = `/producto/${id_producto}`;

}

function irABuscadorCategorias() {

    window.location.href = "/categorias";

}

function cambiarProducto(direccion) {

    productoActual =
        (productoActual + direccion + productos.length + 1) % (productos.length + 1);

    actualizarCarrusel();

}

function actualizarCarrusel() {

    const pista = document.querySelector(".pista-carrusel");

    if (!pista) return;

    pista.style.transform = `translateX(-${productoActual * 100}%)`;

    document.querySelectorAll(".indicador-carrusel").forEach((indicador, indice) => {
        indicador.classList.toggle("activo", indice === productoActual);
    });

}

function agregarGestosCarrusel(contenedor) {

    let inicioX = 0;

    const ventana = contenedor.querySelector(".ventana-carrusel");

    ventana.addEventListener("touchstart", evento => {
        inicioX = evento.touches[0].clientX;
    }, { passive: true });

    ventana.addEventListener("touchend", evento => {
        const desplazamiento = evento.changedTouches[0].clientX - inicioX;

        if (Math.abs(desplazamiento) > 45) {
            cambiarProducto(desplazamiento < 0 ? 1 : -1);
        }
    }, { passive: true });

}

// Envía la identificación del producto para registrar una compra.
async function comprar(id_producto) {

    // POST comunica al servidor una operación que modifica el estado de la aplicación.
    const respuesta = await fetch("/api/comprar", {

        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        // El objeto se serializa como JSON y se envía en el cuerpo de la petición.
        body: JSON.stringify({
            id_producto: id_producto
        })

    });


    const datos = await respuesta.json();


    // 401 representa falta de autenticación; por eso se redirige al login.
    if (respuesta.status === 401) {

        alert("Tenés que iniciar sesión para comprar.");

        window.location.href = "/login";

        return;

    }


    // Si la compra fue correcta, se recarga la colección para actualizar el stock.
    if (respuesta.ok) {

        alert("¡Compra realizada correctamente!");

        cargarProductos();

    } else {

        alert(datos.error);

    }

}


// Llamada inicial: carga los productos cuando se ejecuta el script.
cargarProductos();

