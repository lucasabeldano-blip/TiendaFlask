const listaCategorias = document.getElementById("lista-categorias");

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
                <span aria-hidden="true">#</span>
                <h2>${categoria.nombre}</h2>
                <strong>Ver prendas</strong>
            </a>
        `).join("");

    } catch (error) {

        listaCategorias.innerHTML = `<p role="alert">${error.message}</p>`;

    }

}

cargarCategorias();
