// -----------------------------------------------------------
// Carga de categorías desde la API
// -----------------------------------------------------------
// Este archivo toma los nombres de categorías que devuelve el backend
// y los transforma en enlaces para buscar por ese tipo de producto.
const listaCategorias = document.getElementById("lista-categorias");

function emojiDeCategoria(nombre) {
    const nombreNormalizado = nombre
        .trim()
        .toLocaleLowerCase("es")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

    if (nombreNormalizado.includes("pantal")) return "👖";
    if (nombreNormalizado.includes("remer") || nombreNormalizado.includes("camis")) return "👕";
    if (nombreNormalizado.includes("accesor") || nombreNormalizado.includes("gorra")) return "🧢";
    if (nombreNormalizado.includes("buzo") || nombreNormalizado.includes("camper")) return "🧥";
    if (nombreNormalizado.includes("calzado") || nombreNormalizado.includes("zapat")) return "👟";

    return "🛍️";
}

async function cargarCategorias() {

    try {

        const respuesta = await fetch("/api/categorias");
        const categorias = await respuesta.json();

        if (!respuesta.ok) {
            throw new Error(categorias.error || "No se pudieron cargar las categorías.");
        }

        if (!categorias.length) {
            listaCategorias.innerHTML = "<p>No hay categorías disponibles todavía.</p>";
            return;
        }

        listaCategorias.innerHTML = categorias.map(categoria => `
            <a class="tarjeta-categoria" href="/index?categoria=${encodeURIComponent(categoria.nombre)}">
                <span aria-hidden="true">${emojiDeCategoria(categoria.nombre)}</span>
                <h2>${categoria.nombre.trim().toLocaleLowerCase("es") === "pantalon" ? "pantalones" : categoria.nombre}</h2>
                <strong>Ver prendas</strong>
            </a>
        `).join("");

    } catch (error) {

        listaCategorias.innerHTML = `<p role="alert">${error.message}</p>`;

    }

}

cargarCategorias();
