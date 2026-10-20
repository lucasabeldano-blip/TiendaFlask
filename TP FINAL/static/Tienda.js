// -----------------------------------------------------------
// Estado principal de la tienda
// -----------------------------------------------------------
// Esta parte guarda la lista de productos de la tienda.
let productos = [];

// Cambiá estas rutas por las imágenes que quieras usar desde tu proyecto.
// Por ejemplo: guarda tus archivos en static/img/banners/ y luego reemplazá los nombres.
const bannersPromocionales = [
    {
        titulo: "Ropa streetwear",
        subtitulo: "Colección premium",
        texto: "Ropa urbana, minimalista y lista para moverte con estilo.",
        boton: "Comprar ahora",
        imagen: "/static/img/banners/banner_1.jpg"
    },
    {
        titulo: "chain cubana plata",
        subtitulo: "Estilo urbano",
        texto: "Descubrí chain cubana plata en edición limitada.",
        boton: "Ver chain cubana plata",
        imagen: "/static/img/banners/banner_2.jpg"
    },
    {
        titulo: "Envío gratis",
        subtitulo: "Pago fácil",
        texto: "Cuotas sin interés y entrega rápida para todo el país.",
        boton: "Explorar",
        imagen: "/static/img/banners/banner_3.jpg"
    }
];

let bannerActual = 0;
let intervaloBanner = null;

function cambiarBanner(direccion) {
    bannerActual = (bannerActual + direccion + bannersPromocionales.length) % bannersPromocionales.length;
    renderizarBanner();
    reiniciarAutoBanner();
}

function reiniciarAutoBanner() {
    if (intervaloBanner) {
        clearInterval(intervaloBanner);
    }

    intervaloBanner = setInterval(() => {
        bannerActual = (bannerActual + 1) % bannersPromocionales.length;
        renderizarBanner();
    }, 5000);
}

function renderizarBanner() {
    const contenedor = document.getElementById("hero-section");

    if (!contenedor) return;

    contenedor.innerHTML = `
        <div class="hero-banner" aria-label="Banner promocional">
            <button class="hero-arrow anterior" type="button" aria-label="Banner anterior">&#8249;</button>
            <div class="hero-track">
                ${bannersPromocionales.map((banner, indice) => `
                    <article class="hero-slide ${indice === bannerActual ? "active" : ""}" style="background-image: linear-gradient(90deg, rgba(0,0,0,0.55), rgba(0,0,0,0.18)), url('${banner.imagen}')">
                        <div class="hero-content">
                            <span class="hero-tag">${banner.subtitulo}</span>
                            <h2>${banner.titulo}</h2>
                            <p>${banner.texto}</p>
                            <button type="button">${banner.boton}</button>
                        </div>
                    </article>
                `).join("")}
            </div>
            <button class="hero-arrow siguiente" type="button" aria-label="Banner siguiente">&#8250;</button>
            <div class="hero-dots" aria-label="Indicadores del banner">
                ${bannersPromocionales.map((_, indice) => `
                    <button type="button" class="hero-dot ${indice === bannerActual ? "active" : ""}" data-indice="${indice}" aria-label="Ir al banner ${indice + 1}"></button>
                `).join("")}
            </div>
        </div>
    `;

    const prev = contenedor.querySelector(".hero-arrow.anterior");
    const next = contenedor.querySelector(".hero-arrow.siguiente");

    prev?.addEventListener("click", () => cambiarBanner(-1));
    next?.addEventListener("click", () => cambiarBanner(1));

    contenedor.querySelectorAll(".hero-dot").forEach(dot => {
        dot.addEventListener("click", () => {
            bannerActual = Number(dot.dataset.indice);
            renderizarBanner();
            reiniciarAutoBanner();
        });
    });

    const track = contenedor.querySelector(".hero-track");
    if (track) {
        track.style.transform = `translateX(-${bannerActual * 100}%)`;
    }
}

// -----------------------------------------------------------
// Carga inicial de productos
// -----------------------------------------------------------
// La función detecta si viene una categoría en la URL y arma la petición
// correcta para mostrar solo esos productos.
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

    const productoBanner = productos.find(producto =>
        producto.descripcion.toLowerCase().includes("chain")
    );

    if (productoBanner) {
        bannersPromocionales[1].titulo = productoBanner.descripcion;
        bannersPromocionales[1].texto = `Descubrí ${productoBanner.descripcion} en edición limitada.`;
        bannersPromocionales[1].boton = `Ver ${productoBanner.descripcion}`;
    }


    renderizarProductos();
    renderizarBanner();

}

// -----------------------------------------------------------
// Render de la grilla de productos
// -----------------------------------------------------------
// Muestra todas las prendas juntas para facilitar la comparación.
function renderizarProductos() {

    const contenedor = document.getElementById("productos");

    const tarjetas = productos.map(producto => `

        <article class="tarjeta-producto">
            <img
                class="imagen-producto"
                src="/static/img/productos/${producto.imagen}"
                alt="${producto.descripcion}"
                loading="lazy"
            >
            <div class="datos-producto">
                <h2>${producto.descripcion}</h2>
                <p class="precio-producto">$${producto.precio}</p>
                <p class="disponibilidad-producto">
                    ${producto.unidades_disponibles} unidades disponibles
                </p>
                <button type="button" onclick="verDetalle(${producto.id_producto})">
                    Ver prenda
                </button>
            </div>
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

    contenedor.innerHTML = tarjetas;

}

// -----------------------------------------------------------
// Navegación simple
// -----------------------------------------------------------
// Cada botón lleva al detalle o a la página de categorías.
function verDetalle(id_producto) {

    window.location.href = `/producto/${id_producto}`;

}

function irABuscadorCategorias() {

    window.location.href = "/categorias";

}

function escaparHTML(valor) {
    return String(valor ?? "").replace(/[&<>"']/g, caracter => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;",
        "'": "&#39;"
    })[caracter]);
}

renderizarBanner();
reiniciarAutoBanner();

// Llamada inicial: carga los productos cuando se ejecuta el script.
cargarProductos();
